package com.fitforge.dao;

import com.fitforge.model.WeeklyTarget;
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
public class WeeklyTargetDao {

    private final JdbcTemplate jdbc;

    public WeeklyTargetDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private final RowMapper<WeeklyTarget> rowMapper = (rs, rowNum) -> WeeklyTarget.builder()
            .id(rs.getLong("id"))
            .groupId(rs.getLong("group_id"))
            .userId(rs.getLong("user_id"))
            .weekNumber(rs.getInt("week_number"))
            .targetWeight(rs.getBigDecimal("target_weight"))
            .actualWeight(rs.getBigDecimal("actual_weight"))
            .coachOverride(rs.getBoolean("coach_override"))
            .build();

    public WeeklyTarget create(WeeklyTarget target) {
        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO weekly_targets (group_id, user_id, week_number, target_weight, coach_override) " +
                "VALUES (?, ?, ?, ?, ?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, target.getGroupId());
            ps.setLong(2, target.getUserId());
            ps.setInt(3, target.getWeekNumber());
            ps.setBigDecimal(4, target.getTargetWeight());
            ps.setBoolean(5, target.isCoachOverride());
            return ps;
        }, kh);
        target.setId(((Number) kh.getKeys().get("id")).longValue());
        return target;
    }

    public void batchCreate(List<WeeklyTarget> targets) {
        jdbc.batchUpdate(
            "INSERT INTO weekly_targets (group_id, user_id, week_number, target_weight, coach_override) " +
            "VALUES (?, ?, ?, ?, ?)",
            targets, targets.size(),
            (ps, target) -> {
                ps.setLong(1, target.getGroupId());
                ps.setLong(2, target.getUserId());
                ps.setInt(3, target.getWeekNumber());
                ps.setBigDecimal(4, target.getTargetWeight());
                ps.setBoolean(5, target.isCoachOverride());
            });
    }

    public List<WeeklyTarget> findByGroupAndUser(Long groupId, Long userId) {
        return jdbc.query(
            "SELECT * FROM weekly_targets WHERE group_id = ? AND user_id = ? ORDER BY week_number",
            rowMapper, groupId, userId);
    }

    public Optional<WeeklyTarget> findById(Long id) {
        return jdbc.query("SELECT * FROM weekly_targets WHERE id = ?", rowMapper, id)
                .stream().findFirst();
    }

    public void updateTarget(Long id, WeeklyTarget target) {
        jdbc.update(
            "UPDATE weekly_targets SET target_weight = ?, actual_weight = ?, coach_override = ? WHERE id = ?",
            target.getTargetWeight(), target.getActualWeight(), target.isCoachOverride(), id);
    }

    public void deleteByGroupAndUser(Long groupId, Long userId) {
        jdbc.update("DELETE FROM weekly_targets WHERE group_id = ? AND user_id = ?", groupId, userId);
    }
}
