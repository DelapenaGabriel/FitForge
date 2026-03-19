package com.fitforge.model;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {
    private Long id;
    private String email;
    private String passwordHash;
    private String displayName;
    private String avatarUrl;
    private LocalDateTime createdAt;
}
