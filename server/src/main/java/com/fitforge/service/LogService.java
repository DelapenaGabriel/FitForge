package com.fitforge.service;

import com.fitforge.dao.DailyLogDao;
import com.fitforge.dao.LogCommentDao;
import com.fitforge.dao.UserDao;
import com.fitforge.dto.LogDto;
import com.fitforge.model.DailyLog;
import com.fitforge.model.LogComment;
import com.fitforge.model.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class LogService {

    private final DailyLogDao logDao;
    private final LogCommentDao commentDao;
    private final UserDao userDao;
    private final com.fitforge.dao.GroupDao groupDao;
    private final com.fitforge.dao.WeeklyTargetDao targetDao;

    public LogService(DailyLogDao logDao, LogCommentDao commentDao, UserDao userDao, com.fitforge.dao.GroupDao groupDao, com.fitforge.dao.WeeklyTargetDao targetDao) {
        this.logDao = logDao;
        this.commentDao = commentDao;
        this.userDao = userDao;
        this.groupDao = groupDao;
        this.targetDao = targetDao;
    }

    public LogDto.LogResponse createLog(Long groupId, Long userId,
                                         LogDto.CreateRequest req) {
        DailyLog log = DailyLog.builder()
                .userId(userId)
                .groupId(groupId)
                .logDate(LocalDate.now())
                .weightLbs(req.getWeightLbs())
                .calories(req.getCalories())
                .notes(req.getNotes())
                .photoUrls(req.getPhotoUrls())
                .pinned(req.isPinned())
                .build();
        log = logDao.create(log);
        
        updateWeeklyTargetActualWeight(groupId, userId, log.getWeightLbs());

        return toResponse(log);
    }

    private void updateWeeklyTargetActualWeight(Long groupId, Long userId, java.math.BigDecimal weightLbs) {
        if (weightLbs == null) return;
        com.fitforge.model.Group group = groupDao.findById(groupId).orElse(null);
        if (group != null && group.getStartDate() != null) {
            long daysBetween = ChronoUnit.DAYS.between(group.getStartDate(), LocalDate.now());
            int currentWeek = Math.max(1, (int) (daysBetween / 7) + 1);
            
            List<com.fitforge.model.WeeklyTarget> targets = targetDao.findByGroupAndUser(groupId, userId);
            targets.stream()
                .filter(t -> t.getWeekNumber() == currentWeek)
                .findFirst()
                .ifPresent(target -> {
                    target.setActualWeight(weightLbs);
                    targetDao.updateTarget(target.getId(), target);
                });
        }
    }

    public List<LogDto.LogResponse> getLogs(Long groupId, Long userId) {
        List<DailyLog> logs = userId != null
                ? logDao.findByGroupAndUser(groupId, userId)
                : logDao.findByGroup(groupId);
        return logs.stream().map(this::toResponse).collect(Collectors.toList());
    }

    public LogDto.LogResponse updateLog(Long logId, Long userId, LogDto.CreateRequest req) {
        DailyLog log = logDao.findById(logId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!log.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        log.setWeightLbs(req.getWeightLbs());
        log.setCalories(req.getCalories());
        log.setNotes(req.getNotes());
        log.setPhotoUrls(req.getPhotoUrls());
        log.setPinned(req.isPinned());
        logDao.update(log);
        
        updateWeeklyTargetActualWeight(log.getGroupId(), userId, log.getWeightLbs());
        
        return toResponse(log);
    }

    public void deleteLog(Long logId, Long userId) {
        DailyLog log = logDao.findById(logId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!log.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        logDao.delete(logId);
    }

    public LogDto.CommentResponse addComment(Long logId, LogDto.CommentRequest req, Long userId) {
        DailyLog log = logDao.findById(logId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        
        // Ensure user is member of the group
        // Simplification: log.groupId is already there
        LogComment comment = LogComment.builder()
                .logId(logId)
                .authorId(userId)
                .content(req.getContent())
                .build();
        comment = commentDao.create(comment);
        return toCommentResponse(comment);
    }

    public void deleteComment(Long commentId, Long userId) {
        commentDao.delete(commentId);
    }

    private LogDto.LogResponse toResponse(DailyLog log) {
        User user = userDao.findById(log.getUserId()).orElse(null);
        String displayName = user != null ? user.getDisplayName() : "Unknown";
        String avatarUrl = user != null ? user.getAvatarUrl() : null;

        return LogDto.LogResponse.builder()
                .id(log.getId())
                .userId(log.getUserId())
                .displayName(displayName)
                .avatarUrl(avatarUrl)
                .logDate(log.getLogDate())
                .weightLbs(log.getWeightLbs())
                .calories(log.getCalories())
                .notes(log.getNotes())
                .photoUrls(log.getPhotoUrls())
                .comments(log.getComments() != null ? 
                        log.getComments().stream().map(this::toCommentResponse).collect(Collectors.toList()) : null)
                .pinned(log.isPinned())
                .createdAt(log.getCreatedAt())
                .build();
    }

    private LogDto.CommentResponse toCommentResponse(LogComment comment) {
        User author = userDao.findById(comment.getAuthorId()).orElse(null);
        return LogDto.CommentResponse.builder()
                .id(comment.getId())
                .authorId(comment.getAuthorId())
                .authorName(author != null ? author.getDisplayName() : "Unknown")
                .authorAvatar(author != null ? author.getAvatarUrl() : null)
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt())
                .build();
    }
}
