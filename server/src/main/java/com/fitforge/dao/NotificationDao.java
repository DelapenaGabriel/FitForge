package com.fitforge.dao;

import com.fitforge.model.Notification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Optional;

@Repository
public class NotificationDao {

    private final JdbcTemplate jdbc;

    public NotificationDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private final RowMapper<Notification> rowMapper = (rs, rowNum) -> Notification.builder()
            .id(rs.getLong("id"))
            .userId(rs.getLong("user_id"))
            .groupId(rs.getLong("group_id") == 0 ? null : rs.getLong("group_id")) // handle nulls correctly
            .type(rs.getString("type"))
            .title(rs.getString("title"))
            .message(rs.getString("message"))
            .route(rs.getString("route"))
            .isRead(rs.getBoolean("is_read"))
            .createdAt(rs.getTimestamp("created_at").toLocalDateTime())
            .build();

    public Notification create(Notification notification) {
        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO notifications (user_id, group_id, type, title, message, route, is_read) VALUES (?, ?, ?, ?, ?, ?, ?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, notification.getUserId());
            if (notification.getGroupId() != null) {
                ps.setLong(2, notification.getGroupId());
            } else {
                ps.setNull(2, java.sql.Types.BIGINT);
            }
            ps.setString(3, notification.getType());
            ps.setString(4, notification.getTitle());
            ps.setString(5, notification.getMessage());
            ps.setString(6, notification.getRoute());
            ps.setBoolean(7, notification.isRead());
            return ps;
        }, kh);
        notification.setId(((Number) kh.getKeys().get("id")).longValue());
        notification.setCreatedAt(java.time.LocalDateTime.now());
        return notification;
    }

    public List<Notification> findByUserId(Long userId, int limit) {
        return jdbc.query(
            "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
            rowMapper, userId, limit);
    }

    public Optional<Notification> findById(Long id) {
        return jdbc.query("SELECT * FROM notifications WHERE id = ?", rowMapper, id)
                .stream().findFirst();
    }

    public int markAsRead(Long id, Long userId) {
        return jdbc.update("UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?", id, userId);
    }

    public int markAllAsRead(Long userId) {
        return jdbc.update("UPDATE notifications SET is_read = true WHERE user_id = ?", userId);
    }

    public int countUnreadByUserId(Long userId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = false",
                Integer.class, userId);
        return count != null ? count : 0;
    }

    public void delete(Long id, Long userId) {
        jdbc.update("DELETE FROM notifications WHERE id = ? AND user_id = ?", id, userId);
    }

    public void deleteAll(Long userId) {
        jdbc.update("DELETE FROM notifications WHERE user_id = ?", userId);
    }
}
