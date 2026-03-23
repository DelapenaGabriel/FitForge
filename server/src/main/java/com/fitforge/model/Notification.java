package com.fitforge.model;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {
    private Long id;
    private Long userId;
    private Long groupId;
    private String type;
    private String title;
    private String message;
    private String route;
    private boolean isRead;
    private LocalDateTime createdAt;
}
