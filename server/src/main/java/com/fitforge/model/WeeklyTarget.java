package com.fitforge.model;

import lombok.*;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WeeklyTarget {
    private Long id;
    private Long groupId;
    private Long userId;
    private Integer weekNumber;
    private BigDecimal targetWeight;
    private BigDecimal actualWeight;
    private boolean coachOverride;
}
