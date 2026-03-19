package com.fitforge.model;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CoachPost {
    private Long id;
    private Long groupId;
    private Long authorId;
    private String content;
    private String postType;
    private LocalDateTime createdAt;
}
