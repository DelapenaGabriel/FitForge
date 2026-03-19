package com.fitforge.dao;

import com.fitforge.model.GroupMember;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Optional;

@Repository
public class GroupMemberDao {

    private final JdbcTemplate jdbc;

    public GroupMemberDao(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private final RowMapper<GroupMember> rowMapper = (rs, rowNum) -> GroupMember.builder()
            .id(rs.getLong("id"))
            .groupId(rs.getLong("group_id"))
            .userId(rs.getLong("user_id"))
            .role(rs.getString("role"))
            .startWeight(rs.getBigDecimal("start_weight"))
            .goalWeight(rs.getBigDecimal("goal_weight"))
            .joinedAt(rs.getDate("joined_at").toLocalDate())
            .build();

    public GroupMember create(GroupMember member) {
        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO group_members (group_id, user_id, role, start_weight, goal_weight) " +
                "VALUES (?, ?, ?, ?, ?)",
                Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, member.getGroupId());
            ps.setLong(2, member.getUserId());
            ps.setString(3, member.getRole() != null ? member.getRole() : "MEMBER");
            ps.setBigDecimal(4, member.getStartWeight());
            ps.setBigDecimal(5, member.getGoalWeight());
            return ps;
        }, kh);
        member.setId(((Number) kh.getKeys().get("id")).longValue());
        return member;
    }

    public List<GroupMember> findByGroupId(Long groupId) {
        return jdbc.query("SELECT * FROM group_members WHERE group_id = ?", rowMapper, groupId);
    }

    public Optional<GroupMember> findByGroupAndUser(Long groupId, Long userId) {
        return jdbc.query(
            "SELECT * FROM group_members WHERE group_id = ? AND user_id = ?",
            rowMapper, groupId, userId).stream().findFirst();
    }

    public void updateRole(Long groupId, Long userId, String role) {
        jdbc.update("UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?",
                role, groupId, userId);
    }

    public void updateWeights(Long groupId, Long userId, BigDecimal startWeight, BigDecimal goalWeight) {
        jdbc.update("UPDATE group_members SET start_weight = ?, goal_weight = ? WHERE group_id = ? AND user_id = ?",
                startWeight, goalWeight, groupId, userId);
    }

    public void delete(Long groupId, Long userId) {
        jdbc.update("DELETE FROM group_members WHERE group_id = ? AND user_id = ?", groupId, userId);
    }
}
