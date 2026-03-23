package com.fitforge.model;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyLog {
    private Long id;
    private Long userId;
    private Long groupId;
    private LocalDate logDate;
    private BigDecimal weightLbs;
    private Integer calories;
    private String notes;
    private List<String> photoUrls;
    private boolean pinned;
    private List<LogComment> comments;
    private LocalDateTime createdAt;
}
