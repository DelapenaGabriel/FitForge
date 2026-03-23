package com.fitforge.model;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LogComment {
    private Long id;
    private Long logId;
    private Long authorId;
    private String content;
    private LocalDateTime createdAt;
}
