package com.fitforge.dto;

import lombok.*;

public class AuthDto {

    @Data
    public static class RegisterRequest {
        private String email;
        private String password;
        private String displayName;
    }

    @Data
    public static class LoginRequest {
        private String email;
        private String password;
    }

    @Data
    @AllArgsConstructor
    public static class AuthResponse {
        private String token;
        private UserResponse user;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class UserResponse {
        private Long id;
        private String email;
        private String displayName;
        private String avatarUrl;
    }
}
