package com.fitforge.service;

import com.fitforge.dao.*;
import com.fitforge.dto.LeaderboardDto;
import com.fitforge.model.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class LeaderboardService {

    private final GroupMemberDao memberDao;
    private final DailyLogDao logDao;
    private final UserDao userDao;
    private final GroupDao groupDao;
    private final WeeklyTargetDao targetDao;

    public LeaderboardService(GroupMemberDao memberDao, DailyLogDao logDao, UserDao userDao, GroupDao groupDao, WeeklyTargetDao targetDao) {
        this.memberDao = memberDao;
        this.logDao = logDao;
        this.userDao = userDao;
        this.groupDao = groupDao;
        this.targetDao = targetDao;
    }

    public List<LeaderboardDto.Entry> getLeaderboard(Long groupId) {
        Group group = groupDao.findById(groupId).orElse(null);
        int currentWeek = 1;
        if (group != null && group.getStartDate() != null) {
             long daysBetween = ChronoUnit.DAYS.between(group.getStartDate(), LocalDate.now());
             currentWeek = Math.max(1, (int) (daysBetween / 7) + 1);
        }

        List<GroupMember> members = memberDao.findByGroupId(groupId);

        List<LeaderboardDto.Entry> entries = new ArrayList<>();
        int finalCurrentWeek = currentWeek;
        for (GroupMember m : members) {
            User user = userDao.findById(m.getUserId()).orElse(null);
            if (user == null) continue;

            List<DailyLog> logs = logDao.findByGroupAndUser(groupId, m.getUserId());
            BigDecimal currentWeight = logs.isEmpty() ? m.getStartWeight() : logs.get(0).getWeightLbs();
            BigDecimal previousWeight = logs.size() > 1 ? logs.get(1).getWeightLbs() : currentWeight;

            double progress = calculateProgress(m.getStartWeight(), m.getGoalWeight(), currentWeight);
            BigDecimal weeklyChange = currentWeight != null && previousWeight != null
                    ? currentWeight.subtract(previousWeight)
                    : BigDecimal.ZERO;

            List<WeeklyTarget> targets = targetDao.findByGroupAndUser(groupId, m.getUserId());
            BigDecimal currentWeekGoal = targets.stream()
                    .filter(t -> t.getWeekNumber() == finalCurrentWeek)
                    .map(WeeklyTarget::getTargetWeight)
                    .findFirst()
                    .orElse(m.getGoalWeight()); // fallback to final goal


            entries.add(LeaderboardDto.Entry.builder()
                    .userId(m.getUserId())
                    .displayName(user.getDisplayName())
                    .avatarUrl(user.getAvatarUrl())
                    .startWeight(m.getStartWeight())
                    .goalWeight(m.getGoalWeight())
                    .currentWeight(currentWeight)
                    .progressPercent(progress)
                    .weeklyChange(weeklyChange)
                    .currentWeekGoal(currentWeekGoal)
                    .build());
        }

        // Sort by progress descending
        entries.sort((a, b) -> Double.compare(b.getProgressPercent(), a.getProgressPercent()));

        // Assign ranks
        for (int i = 0; i < entries.size(); i++) {
            entries.get(i).setRank(i + 1);
        }

        return entries;
    }

    private double calculateProgress(BigDecimal start, BigDecimal goal, BigDecimal current) {
        if (start == null || goal == null || current == null) return 0;
        BigDecimal totalToLose = start.subtract(goal);
        if (totalToLose.compareTo(BigDecimal.ZERO) == 0) return 100;
        BigDecimal lost = start.subtract(current);
        return Math.max(0, Math.min(100,
                lost.divide(totalToLose, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100))
                        .doubleValue()));
    }
}
