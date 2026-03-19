package com.fitforge.dto;

import lombok.*;
import java.math.BigDecimal;

public class TargetDto {

    @Data
    @Builder
    @AllArgsConstructor
    public static class TargetResponse {
        private Long id;
        private Integer weekNumber;
        private BigDecimal targetWeight;
        private BigDecimal actualWeight;
        private boolean coachOverride;
    }

    @Data
    public static class UpdateRequest {
        private BigDecimal targetWeight;
    }
}
