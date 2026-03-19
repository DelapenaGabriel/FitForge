package com.fitforge.service;

import com.fitforge.dao.WeeklyTargetDao;
import com.fitforge.dao.GroupMemberDao;
import com.fitforge.dto.TargetDto;
import com.fitforge.model.WeeklyTarget;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class TargetService {

    private final WeeklyTargetDao targetDao;
    private final GroupMemberDao memberDao;

    public TargetService(WeeklyTargetDao targetDao, GroupMemberDao memberDao) {
        this.targetDao = targetDao;
        this.memberDao = memberDao;
    }

    public List<TargetDto.TargetResponse> getTargets(Long groupId, Long userId) {
        return targetDao.findByGroupAndUser(groupId, userId).stream()
                .map(this::toResponse).toList();
    }

    public TargetDto.TargetResponse coachUpdateTarget(Long targetId, TargetDto.UpdateRequest req, Long coachId) {
        WeeklyTarget target = targetDao.findById(targetId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        // Verify coach
        memberDao.findByGroupAndUser(target.getGroupId(), coachId)
                .filter(m -> "COACH".equals(m.getRole()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Coach role required"));

        target.setTargetWeight(req.getTargetWeight());
        target.setCoachOverride(true);
        targetDao.updateTarget(targetId, target);
        return toResponse(target);
    }

    private TargetDto.TargetResponse toResponse(WeeklyTarget t) {
        return TargetDto.TargetResponse.builder()
                .id(t.getId())
                .weekNumber(t.getWeekNumber())
                .targetWeight(t.getTargetWeight())
                .actualWeight(t.getActualWeight())
                .coachOverride(t.isCoachOverride())
                .build();
    }
}
