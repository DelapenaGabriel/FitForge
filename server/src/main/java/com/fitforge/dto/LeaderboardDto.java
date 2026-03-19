package com.fitforge.dto;

import lombok.*;
import java.math.BigDecimal;

public class LeaderboardDto {

    @Data
    @Builder
    @AllArgsConstructor
    public static class Entry {
        private int rank;
        private Long userId;
        private String displayName;
        private String avatarUrl;
        private BigDecimal startWeight;
        private BigDecimal goalWeight;
        private BigDecimal currentWeight;
        private double progressPercent;
        private BigDecimal weeklyChange;
        private BigDecimal currentWeekGoal;
    }
}
