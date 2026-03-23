package com.fitforge.service;

import com.fitforge.dao.*;
import com.fitforge.dto.GroupDto;
import com.fitforge.model.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class GroupService {

    private final GroupDao groupDao;
    private final GroupMemberDao memberDao;
    private final WeeklyTargetDao targetDao;
    private final GroupInviteDao inviteDao;
    private final UserDao userDao;
    private final DailyLogDao logDao;
    private final NotificationService notificationService;

    public GroupService(GroupDao groupDao, GroupMemberDao memberDao,
                        WeeklyTargetDao targetDao, GroupInviteDao inviteDao,
                        UserDao userDao, DailyLogDao logDao, NotificationService notificationService) {
        this.groupDao = groupDao;
        this.memberDao = memberDao;
        this.targetDao = targetDao;
        this.inviteDao = inviteDao;
        this.userDao = userDao;
        this.logDao = logDao;
        this.notificationService = notificationService;
    }

    public GroupDto.GroupResponse createGroup(GroupDto.CreateRequest req, Long userId) {
        Group group = Group.builder()
                .name(req.getName())
                .description(req.getDescription())
                .ownerId(userId)
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .status("ACTIVE")
                .build();
        group = groupDao.create(group);

        // Creator joins as COACH
        GroupMember member = GroupMember.builder()
                .groupId(group.getId())
                .userId(userId)
                .role("COACH")
                .startWeight(req.getStartWeight())
                .goalWeight(req.getGoalWeight())
                .build();
        memberDao.create(member);

        // Generate weekly targets for the creator
        generateWeeklyTargets(group, member);

        return toResponse(group, userId);
    }

    public List<GroupDto.GroupResponse> getMyGroups(Long userId) {
        return groupDao.findByUserId(userId).stream()
                .map(g -> toResponse(g, userId))
                .toList();
    }

    public GroupDto.GroupResponse getGroup(Long groupId, Long userId) {
        Group group = groupDao.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));
        return toResponse(group, userId);
    }

    public GroupDto.GroupResponse updateGroup(Long groupId, GroupDto.CreateRequest req, Long userId) {
        Group group = groupDao.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));
        requireCoach(groupId, userId);

        group.setName(req.getName());
        group.setDescription(req.getDescription());
        group.setStartDate(req.getStartDate());
        group.setEndDate(req.getEndDate());
        groupDao.update(group);
        return toResponse(group, userId);
    }

    public void deleteGroup(Long groupId, Long userId) {
        requireCoach(groupId, userId);
        groupDao.delete(groupId);
    }

    public List<GroupDto.MemberResponse> getMembers(Long groupId) {
        return memberDao.findByGroupId(groupId).stream().map(m -> {
            User u = userDao.findById(m.getUserId()).orElse(null);
            BigDecimal currentWeight = logDao.findLatestByGroupAndUser(groupId, m.getUserId())
                    .map(DailyLog::getWeightLbs)
                    .orElse(m.getStartWeight());
            double progress = calculateProgress(m.getStartWeight(), m.getGoalWeight(), currentWeight);

            return GroupDto.MemberResponse.builder()
                    .userId(m.getUserId())
                    .displayName(u != null ? u.getDisplayName() : "Unknown")
                    .avatarUrl(u != null ? u.getAvatarUrl() : null)
                    .role(m.getRole())
                    .startWeight(m.getStartWeight())
                    .goalWeight(m.getGoalWeight())
                    .currentWeight(currentWeight)
                    .progressPercent(progress)
                    .joinedAt(m.getJoinedAt())
                    .build();
        }).toList();
    }

    public GroupDto.InviteResponse createInvite(Long groupId, String email, Long userId) {
        requireCoach(groupId, userId);
        Group group = groupDao.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        User inviter = userDao.findById(userId).orElseThrow();

        String token = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        GroupInvite invite = GroupInvite.builder()
                .groupId(groupId)
                .inviteEmail(email)
                .token(token)
                .status("PENDING")
                .expiresAt(java.time.LocalDateTime.now().plusDays(7))
                .build();
        inviteDao.create(invite);

        return GroupDto.InviteResponse.builder()
                .token(token)
                .groupName(group.getName())
                .inviterName(inviter.getDisplayName())
                .build();
    }

    public GroupDto.GroupResponse joinGroup(String token, GroupDto.JoinRequest req, Long userId) {
        GroupInvite invite = inviteDao.findByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invalid invite"));

        if (!"PENDING".equals(invite.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invite already used");
        }
        if (invite.getExpiresAt().isBefore(java.time.LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invite expired");
        }

        Group group = groupDao.findById(invite.getGroupId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        // Check not already a member
        if (memberDao.findByGroupAndUser(invite.getGroupId(), userId).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already a member");
        }

        GroupMember member = GroupMember.builder()
                .groupId(invite.getGroupId())
                .userId(userId)
                .role("MEMBER")
                .startWeight(req.getStartWeight())
                .goalWeight(req.getGoalWeight())
                .build();
        memberDao.create(member);

        generateWeeklyTargets(group, member);

        inviteDao.updateStatus(invite.getId(), "ACCEPTED");
        
        User joiner = userDao.findById(userId).orElse(null);
        String joinerName = joiner != null ? joiner.getDisplayName() : "Someone";
        notificationService.notifyGroupMembers(
            invite.getGroupId(),
            userId,
            "MEMBER_JOINED",
            "New Member",
            "👥 " + joinerName + " joined the group!",
            "/app/groups/" + invite.getGroupId() + "?tab=members"
        );

        return toResponse(group, userId);
    }

    public GroupDto.InviteInfo validateInvite(String token, Long userId) {
        GroupInvite invite = inviteDao.findByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invalid invite token"));

        Group group = groupDao.findById(invite.getGroupId()).orElseThrow();
        boolean alreadyMember = userId != null && memberDao.findByGroupAndUser(invite.getGroupId(), userId).isPresent();

        return GroupDto.InviteInfo.builder()
                .token(token)
                .groupId(invite.getGroupId())
                .groupName(group.getName())
                .status(invite.getStatus())
                .alreadyMember(alreadyMember)
                .endDate(group.getEndDate())
                .build();
    }

    public void removeMember(Long groupId, Long targetUserId, Long requesterId) {
        if (!targetUserId.equals(requesterId)) {
            requireCoach(groupId, requesterId);
        }
        memberDao.delete(groupId, targetUserId);
        targetDao.deleteByGroupAndUser(groupId, targetUserId);
    }

    public void updateMemberRole(Long groupId, Long targetUserId, String role, Long requesterId) {
        requireCoach(groupId, requesterId);
        memberDao.updateRole(groupId, targetUserId, role);
    }

    public void updateMemberGoalWeight(Long groupId, Long targetUserId, BigDecimal newGoalWeight, Long requesterId) {
        if (!targetUserId.equals(requesterId)) {
            requireCoach(groupId, requesterId);
        }
        GroupMember member = memberDao.findByGroupAndUser(groupId, targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found"));

        memberDao.updateWeights(groupId, targetUserId, member.getStartWeight(), newGoalWeight);
        member.setGoalWeight(newGoalWeight);

        Group group = groupDao.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));
        recalculateWeeklyTargets(group, member);
    }

    private void recalculateWeeklyTargets(Group group, GroupMember member) {
        if (member.getStartWeight() == null || member.getGoalWeight() == null) return;

        long totalDays = ChronoUnit.DAYS.between(group.getStartDate(), group.getEndDate());
        int totalWeeks = Math.max(1, (int) (totalDays / 7));

        BigDecimal totalLoss = member.getStartWeight().subtract(member.getGoalWeight());
        BigDecimal weeklyLoss = totalLoss.divide(BigDecimal.valueOf(totalWeeks), 2, RoundingMode.HALF_UP);

        List<WeeklyTarget> existingTargets = targetDao.findByGroupAndUser(group.getId(), member.getUserId());

        for (int w = 1; w <= totalWeeks; w++) {
            BigDecimal newTargetWeight = member.getStartWeight()
                    .subtract(weeklyLoss.multiply(BigDecimal.valueOf(w)));

            int weekNum = w;
            java.util.Optional<WeeklyTarget> existingTarget = existingTargets.stream()
                    .filter(t -> t.getWeekNumber() == weekNum)
                    .findFirst();

            if (existingTarget.isPresent()) {
                WeeklyTarget t = existingTarget.get();
                if (!t.isCoachOverride()) {
                    t.setTargetWeight(newTargetWeight);
                    targetDao.updateTarget(t.getId(), t);
                }
            } else {
                targetDao.create(WeeklyTarget.builder()
                        .groupId(group.getId())
                        .userId(member.getUserId())
                        .weekNumber(w)
                        .targetWeight(newTargetWeight)
                        .coachOverride(false)
                        .build());
            }
        }
    }

    // ── Helpers ──

    public void generateWeeklyTargets(Group group, GroupMember member) {
        if (member.getStartWeight() == null || member.getGoalWeight() == null) return;

        long totalDays = ChronoUnit.DAYS.between(group.getStartDate(), group.getEndDate());
        int totalWeeks = Math.max(1, (int) (totalDays / 7));

        BigDecimal totalLoss = member.getStartWeight().subtract(member.getGoalWeight());
        BigDecimal weeklyLoss = totalLoss.divide(BigDecimal.valueOf(totalWeeks), 2, RoundingMode.HALF_UP);

        List<WeeklyTarget> targets = new ArrayList<>();
        for (int w = 1; w <= totalWeeks; w++) {
            BigDecimal targetWeight = member.getStartWeight()
                    .subtract(weeklyLoss.multiply(BigDecimal.valueOf(w)));
            targets.add(WeeklyTarget.builder()
                    .groupId(group.getId())
                    .userId(member.getUserId())
                    .weekNumber(w)
                    .targetWeight(targetWeight)
                    .coachOverride(false)
                    .build());
        }
        targetDao.batchCreate(targets);
    }

    private double calculateProgress(BigDecimal startWeight, BigDecimal goalWeight, BigDecimal currentWeight) {
        if (startWeight == null || goalWeight == null || currentWeight == null) return 0;
        BigDecimal totalToLose = startWeight.subtract(goalWeight);
        if (totalToLose.compareTo(BigDecimal.ZERO) == 0) return 100;
        BigDecimal lost = startWeight.subtract(currentWeight);
        return lost.divide(totalToLose, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .doubleValue();
    }

    private void requireCoach(Long groupId, Long userId) {
        GroupMember member = memberDao.findByGroupAndUser(groupId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a member"));
        if (!"COACH".equals(member.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Coach role required");
        }
    }

    private GroupDto.GroupResponse toResponse(Group group, Long userId) {
        long totalDays = ChronoUnit.DAYS.between(group.getStartDate(), group.getEndDate());
        int totalWeeks = Math.max(1, (int) (totalDays / 7));
        int memberCount = memberDao.findByGroupId(group.getId()).size();
        
        GroupMember member = memberDao.findByGroupAndUser(group.getId(), userId).orElse(null);
        String myRole = member != null ? member.getRole() : null;
        
        double myProgress = 0;
        if (member != null) {
            BigDecimal currentWeight = logDao.findLatestByGroupAndUser(group.getId(), userId)
                    .map(DailyLog::getWeightLbs)
                    .orElse(member.getStartWeight());
            myProgress = calculateProgress(member.getStartWeight(), member.getGoalWeight(), currentWeight);
        }

        return GroupDto.GroupResponse.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .ownerId(group.getOwnerId())
                .startDate(group.getStartDate())
                .endDate(group.getEndDate())
                .status(group.getStatus())
                .totalWeeks(totalWeeks)
                .memberCount(memberCount)
                .myRole(myRole)
                .myProgress(myProgress)
                .build();
    }
}
