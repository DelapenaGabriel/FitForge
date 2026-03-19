package com.fitforge.controller;

import com.fitforge.dto.AuthDto;
import com.fitforge.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthDto.AuthResponse> register(@RequestBody AuthDto.RegisterRequest req) {
        return ResponseEntity.ok(authService.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthDto.AuthResponse> login(@RequestBody AuthDto.LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    @GetMapping("/me")
    public ResponseEntity<AuthDto.UserResponse> me(Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(authService.getCurrentUser(userId));
    }

    @PutMapping("/me")
    public ResponseEntity<AuthDto.UserResponse> updateProfile(
            Authentication auth,
            @RequestParam(required = false) String displayName,
            @RequestParam(required = false) String avatarUrl) {
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(authService.updateProfile(userId, displayName, avatarUrl));
    }
}
