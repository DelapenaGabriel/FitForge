package com.fitforge.service;

import com.fitforge.config.JwtUtil;
import com.fitforge.dao.UserDao;
import com.fitforge.dto.AuthDto;
import com.fitforge.model.User;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserDao userDao;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(UserDao userDao, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userDao = userDao;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public AuthDto.AuthResponse register(AuthDto.RegisterRequest req) {
        if (userDao.findByEmail(req.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        User user = User.builder()
                .email(req.getEmail())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .displayName(req.getDisplayName())
                .build();
        user = userDao.create(user);

        String token = jwtUtil.generateToken(user.getId(), user.getEmail());
        return new AuthDto.AuthResponse(token, toResponse(user));
    }

    public AuthDto.AuthResponse login(AuthDto.LoginRequest req) {
        User user = userDao.findByEmail(req.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getEmail());
        return new AuthDto.AuthResponse(token, toResponse(user));
    }

    public AuthDto.UserResponse getCurrentUser(Long userId) {
        User user = userDao.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return toResponse(user);
    }

    public AuthDto.UserResponse updateProfile(Long userId, String displayName, String avatarUrl) {
        User user = userDao.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setDisplayName(displayName);
        user.setAvatarUrl(avatarUrl);
        userDao.update(user);
        return toResponse(user);
    }

    private AuthDto.UserResponse toResponse(User user) {
        return AuthDto.UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .avatarUrl(user.getAvatarUrl())
                .build();
    }
}
