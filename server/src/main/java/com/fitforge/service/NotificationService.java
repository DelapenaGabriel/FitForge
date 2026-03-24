package com.fitforge.service;

import com.fitforge.dao.GroupMemberDao;
import com.fitforge.dao.NotificationDao;
import com.fitforge.dao.UserDao;
import com.fitforge.dto.NotificationDto;
import com.fitforge.model.GroupMember;
import com.fitforge.model.Notification;
import com.fitforge.model.User;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class NotificationService {

    private final NotificationDao notificationDao;
    private final GroupMemberDao memberDao;
    private final UserDao userDao;

    public NotificationService(NotificationDao notificationDao, GroupMemberDao memberDao, UserDao userDao) {
        this.notificationDao = notificationDao;
        this.memberDao = memberDao;
        this.userDao = userDao;
    }

    public void notifyGroupMembers(Long groupId, Long excludeUserId, String type, String title, String message, String route) {
        List<GroupMember> members = memberDao.findByGroupId(groupId);
        for (GroupMember member : members) {
            if (excludeUserId != null && member.getUserId().equals(excludeUserId)) {
                continue; // don't notify the person who took the action
            }
            Notification n = Notification.builder()
                    .userId(member.getUserId())
                    .groupId(groupId)
                    .type(type)
                    .title(title)
                    .message(message)
                    .route(route)
                    .isRead(false)
                    .build();
            notificationDao.create(n);
        }
    }

    public void notifyUser(Long userId, Long groupId, String type, String title, String message, String route) {
        Notification n = Notification.builder()
                .userId(userId)
                .groupId(groupId)
                .type(type)
                .title(title)
                .message(message)
                .route(route)
                .isRead(false)
                .build();
        notificationDao.create(n);
    }

    public List<NotificationDto.Response> getUserNotifications(Long userId, int limit) {
        return notificationDao.findByUserId(userId, limit).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public int getUnreadCount(Long userId) {
        return notificationDao.countUnreadByUserId(userId);
    }

    public void markAsRead(Long notificationId, Long userId) {
        notificationDao.markAsRead(notificationId, userId);
    }

    public void markAllAsRead(Long userId) {
        notificationDao.markAllAsRead(userId);
    }

    public void deleteAll(Long userId) {
        notificationDao.deleteAll(userId);
    }

    public void delete(Long id, Long userId) {
        notificationDao.delete(id, userId);
    }

    private NotificationDto.Response toResponse(Notification n) {
        return NotificationDto.Response.builder()
                .id(n.getId())
                .groupId(n.getGroupId())
                .type(n.getType())
                .title(n.getTitle())
                .message(n.getMessage())
                .route(n.getRoute())
                .isRead(n.isRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
