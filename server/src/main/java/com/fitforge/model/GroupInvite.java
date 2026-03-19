package com.fitforge.model;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupInvite {
    private Long id;
    private Long groupId;
    private String inviteEmail;
    private String token;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
}
