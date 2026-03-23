package com.fitforge.dao;

import com.fitforge.model.DailyLog;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Types;
import java.util.List;
import java.util.Optional;
import com.fitforge.model.LogComment;

@Repository
public class DailyLogDao {

    private final JdbcTemplate jdbc;

    public DailyLogDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private final RowMapper<DailyLog> rowMapper = (rs, rowNum) -> {
        Long id = rs.getLong("id");
        return DailyLog.builder()
                .id(id)
                .userId(rs.getLong("user_id"))
                .groupId(rs.getLong("group_id"))
                .logDate(rs.getDate("log_date").toLocalDate())
                .weightLbs(rs.getBigDecimal("weight_lbs"))
                .calories(rs.getObject("calories", Integer.class))
                .notes(rs.getString("notes"))
                .pinned(rs.getBoolean("pinned"))
                .photoUrls(fetchPhotosForLog(id))
                .comments(fetchCommentsForLog(id))
                .createdAt(rs.getTimestamp("created_at").toLocalDateTime())
                .build();
    };

    private List<String> fetchPhotosForLog(Long logId) {
        return jdbc.query("SELECT photo_url FROM log_photos WHERE log_id = ?",
                (rs, rowNum) -> rs.getString("photo_url"), logId);
    }

    private List<LogComment> fetchCommentsForLog(Long logId) {
        return jdbc.query("SELECT * FROM log_comments WHERE log_id = ? ORDER BY created_at ASC",
                (rs, rowNum) -> LogComment.builder()
                        .id(rs.getLong("id"))
                        .logId(rs.getLong("log_id"))
                        .authorId(rs.getLong("author_id"))
                        .content(rs.getString("content"))
                        .createdAt(rs.getTimestamp("created_at").toLocalDateTime())
                        .build(), logId);
    }

    public DailyLog create(DailyLog log) {
        KeyHolder kh = new GeneratedKeyHolder();
        
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO daily_logs (user_id, group_id, log_date, weight_lbs, calories, notes, pinned) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, log.getUserId());
            ps.setLong(2, log.getGroupId());
            ps.setDate(3, Date.valueOf(log.getLogDate()));
            ps.setBigDecimal(4, log.getWeightLbs());
            if (log.getCalories() != null) {
                ps.setInt(5, log.getCalories());
            } else {
                ps.setNull(5, Types.INTEGER);
            }
            ps.setString(6, log.getNotes());
            ps.setBoolean(7, log.isPinned());
            return ps;
        }, kh);
        
        log.setId(((Number) kh.getKeys().get("id")).longValue());
        savePhotos(log.getId(), log.getPhotoUrls());
        return log;
    }

    private void savePhotos(Long logId, List<String> urls) {
        jdbc.update("DELETE FROM log_photos WHERE log_id = ?", logId);
        if (urls != null && !urls.isEmpty()) {
            for (String url : urls) {
                jdbc.update("INSERT INTO log_photos (log_id, photo_url) VALUES (?, ?)", logId, url);
            }
        }
    }

    public Optional<DailyLog> findById(Long id) {
        return jdbc.query("SELECT * FROM daily_logs WHERE id = ?", rowMapper, id)
                .stream().findFirst();
    }

    public List<DailyLog> findByGroupAndUser(Long groupId, Long userId) {
        return jdbc.query(
            "SELECT * FROM daily_logs WHERE group_id = ? AND user_id = ? ORDER BY pinned DESC, log_date DESC",
            rowMapper, groupId, userId);
    }

    public List<DailyLog> findByGroup(Long groupId) {
        return jdbc.query(
            "SELECT * FROM daily_logs WHERE group_id = ? ORDER BY log_date DESC",
            rowMapper, groupId);
    }

    public Optional<DailyLog> findLatestByGroupAndUser(Long groupId, Long userId) {
        return jdbc.query(
            "SELECT * FROM daily_logs WHERE group_id = ? AND user_id = ? ORDER BY log_date DESC LIMIT 1",
            rowMapper, groupId, userId).stream().findFirst();
    }

    public void update(DailyLog log) {
        jdbc.update(
            "UPDATE daily_logs SET weight_lbs = ?, calories = ?, notes = ?, pinned = ? WHERE id = ?",
            log.getWeightLbs(), log.getCalories(), log.getNotes(), log.isPinned(), log.getId());
        savePhotos(log.getId(), log.getPhotoUrls());
    }

    public void delete(Long id) {
        // Photos will be deleted via ON DELETE CASCADE in the database
        jdbc.update("DELETE FROM daily_logs WHERE id = ?", id);
    }
}
