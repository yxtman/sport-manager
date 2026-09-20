package com.sport.api.auth;

public record ChangePasswordRequest(String oldPassword, String newPassword) {
}
