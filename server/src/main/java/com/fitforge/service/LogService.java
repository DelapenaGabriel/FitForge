package com.fitforge.service;

import com.fitforge.dao.DailyLogDao;
import com.fitforge.dao.UserDao;
import com.fitforge.dto.LogDto;
import com.fitforge.model.DailyLog;
import com.fitforge.model.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

@Service
public class LogService {

    private final DailyLogDao logDao;
    private final UserDao userDao;
    private final com.fitforge.dao.GroupDao groupDao;
    private final com.fitforge.dao.WeeklyTargetDao targetDao;

    public LogService(DailyLogDao logDao, UserDao userDao, com.fitforge.dao.GroupDao groupDao, com.fitforge.dao.WeeklyTargetDao targetDao) {
        this.logDao = logDao;
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
        return logs.stream().map(this::toResponse).toList();
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

    private LogDto.LogResponse toResponse(DailyLog log) {
        String displayName = userDao.findById(log.getUserId())
                .map(User::getDisplayName).orElse("Unknown");
        return LogDto.LogResponse.builder()
                .id(log.getId())
                .userId(log.getUserId())
                .displayName(displayName)
                .logDate(log.getLogDate())
                .weightLbs(log.getWeightLbs())
                .calories(log.getCalories())
                .notes(log.getNotes())
                .photoUrls(log.getPhotoUrls())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
