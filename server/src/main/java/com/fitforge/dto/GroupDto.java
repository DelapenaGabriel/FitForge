package com.fitforge.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import jakarta.validation.constraints.NotNull;

public class GroupDto {

    @Data
    public static class CreateRequest {
        private String name;
        private String description;
        private LocalDate startDate;
        private LocalDate endDate;
        private BigDecimal startWeight;
        private BigDecimal goalWeight;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class GroupResponse {
        private Long id;
        private String name;
        private String description;
        private Long ownerId;
        private LocalDate startDate;
        private LocalDate endDate;
        private String status;
        private int totalWeeks;
        private int memberCount;
        private String myRole;
        private double myProgress;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class MemberResponse {
        private Long userId;
        private String displayName;
        private String avatarUrl;
        private String role;
        private BigDecimal startWeight;
        private BigDecimal goalWeight;
        private BigDecimal currentWeight;
        private double progressPercent;
        private LocalDate joinedAt;
    }

    @Data
    public static class InviteRequest {
        private String email;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class InviteResponse {
        private String token;
        private String groupName;
        private String inviterName;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class InviteInfo {
        private String token;
        private Long groupId;
        private String groupName;
        private String inviterName;
        private String status;
        private boolean alreadyMember;
        private LocalDate endDate;
    }

    @Data
    public static class JoinRequest {
        private BigDecimal startWeight;
        private BigDecimal goalWeight;
    }

    @Data
    public static class UpdateGoalWeightRequest {
        @NotNull(message = "Goal weight is required")
        private BigDecimal goalWeight;
    }
}
