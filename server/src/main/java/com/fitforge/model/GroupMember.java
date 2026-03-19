package com.fitforge.model;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupMember {
    private Long id;
    private Long groupId;
    private Long userId;
    private String role;
    private BigDecimal startWeight;
    private BigDecimal goalWeight;
    private LocalDate joinedAt;
}
