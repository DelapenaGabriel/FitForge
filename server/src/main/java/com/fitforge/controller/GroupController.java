package com.fitforge.controller;

import com.fitforge.dto.GroupDto;
import com.fitforge.model.GroupInvite;
import com.fitforge.service.GroupService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class GroupController {

    private final GroupService groupService;

    public GroupController(GroupService groupService) {
        this.groupService = groupService;
    }

    // ── Groups ──

    @PostMapping("/groups")
    public ResponseEntity<GroupDto.GroupResponse> createGroup(
            @RequestBody GroupDto.CreateRequest req, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(groupService.createGroup(req, userId));
    }

    @GetMapping("/groups")
    public ResponseEntity<List<GroupDto.GroupResponse>> getMyGroups(Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(groupService.getMyGroups(userId));
    }

    @GetMapping("/groups/{id}")
    public ResponseEntity<GroupDto.GroupResponse> getGroup(
            @PathVariable Long id, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(groupService.getGroup(id, userId));
    }

    @PutMapping("/groups/{id}")
    public ResponseEntity<GroupDto.GroupResponse> updateGroup(
            @PathVariable Long id, @RequestBody GroupDto.CreateRequest req, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(groupService.updateGroup(id, req, userId));
    }

    @DeleteMapping("/groups/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable Long id, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        groupService.deleteGroup(id, userId);
        return ResponseEntity.noContent().build();
    }

    // ── Members ──

    @GetMapping("/groups/{id}/members")
    public ResponseEntity<List<GroupDto.MemberResponse>> getMembers(@PathVariable Long id) {
        return ResponseEntity.ok(groupService.getMembers(id));
    }

    @PutMapping("/groups/{groupId}/members/{userId}/role")
    public ResponseEntity<Void> updateRole(
            @PathVariable Long groupId, @PathVariable Long userId,
            @RequestBody Map<String, String> body, Authentication auth) {
        Long requesterId = (Long) auth.getPrincipal();
        groupService.updateMemberRole(groupId, userId, body.get("role"), requesterId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/groups/{groupId}/members/{userId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long groupId, @PathVariable Long userId, Authentication auth) {
        Long requesterId = (Long) auth.getPrincipal();
        groupService.removeMember(groupId, userId, requesterId);
        return ResponseEntity.noContent().build();
    }

    // ── Invites ──

    @PostMapping("/groups/{id}/invites")
    public ResponseEntity<GroupDto.InviteResponse> createInvite(
            @PathVariable Long id, @RequestBody GroupDto.InviteRequest req, Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(groupService.createInvite(id, req.getEmail(), userId));
    }

    @GetMapping("/invites/{token}")
    public ResponseEntity<GroupDto.InviteInfo> validateInvite(@PathVariable String token, Authentication auth) {
        Long userId = (auth != null && auth.getPrincipal() instanceof Long) ? (Long) auth.getPrincipal() : null;
        return ResponseEntity.ok(groupService.validateInvite(token, userId));
    }

    @PostMapping("/invites/{token}/accept")
    public ResponseEntity<GroupDto.GroupResponse> acceptInvite(
            @PathVariable String token, @RequestBody GroupDto.JoinRequest req, Authentication auth) {
        if (auth == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        Long userId = (Long) auth.getPrincipal();
        return ResponseEntity.ok(groupService.joinGroup(token, req, userId));
    }
}
