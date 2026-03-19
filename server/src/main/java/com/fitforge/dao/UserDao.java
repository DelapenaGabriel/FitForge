package com.fitforge.dao;

import com.fitforge.model.User;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.Optional;

@Repository
public class UserDao {

    private final JdbcTemplate jdbc;

    public UserDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private final RowMapper<User> rowMapper = (rs, rowNum) -> User.builder()
            .id(rs.getLong("id"))
            .email(rs.getString("email"))
            .passwordHash(rs.getString("password_hash"))
            .displayName(rs.getString("display_name"))
            .avatarUrl(rs.getString("avatar_url"))
            .createdAt(rs.getTimestamp("created_at").toLocalDateTime())
            .build();

    public User create(User user) {
        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO users (email, password_hash, display_name, avatar_url) VALUES (?, ?, ?, ?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, user.getEmail());
            ps.setString(2, user.getPasswordHash());
            ps.setString(3, user.getDisplayName());
            ps.setString(4, user.getAvatarUrl());
            return ps;
        }, kh);
        user.setId(((Number) kh.getKeys().get("id")).longValue());
        return user;
    }

    public Optional<User> findById(Long id) {
        return jdbc.query("SELECT * FROM users WHERE id = ?", rowMapper, id)
                .stream().findFirst();
    }

    public Optional<User> findByEmail(String email) {
        return jdbc.query("SELECT * FROM users WHERE email = ?", rowMapper, email)
                .stream().findFirst();
    }

    public void update(User user) {
        jdbc.update("UPDATE users SET display_name = ?, avatar_url = ? WHERE id = ?",
                user.getDisplayName(), user.getAvatarUrl(), user.getId());
    }
}
