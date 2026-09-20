package com.sport.api.auth;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private final AuthService authService;

	public AuthController(AuthService authService) {
		this.authService = authService;
	}

	@PostMapping("/register")
	public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest body) {
		return ResponseEntity.ok(authService.register(body));
	}

	@PostMapping("/login")
	public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest body) {
		return ResponseEntity.ok(authService.login(body));
	}

	@GetMapping("/me")
	public ResponseEntity<UserInfo> me(@RequestHeader(value = "Authorization", required = false) String authorization) {
		return ResponseEntity.ok(authService.me(authorization));
	}

	@PatchMapping("/profile")
	public ResponseEntity<UserInfo> updateProfile(@RequestHeader(value = "Authorization", required = false) String authorization,
			@RequestBody UpdateProfileRequest body) {
		return ResponseEntity.ok(authService.updateProfile(authorization, body));
	}

	@PostMapping("/change-password")
	public ResponseEntity<AuthService.MapResponse> changePassword(
			@RequestHeader(value = "Authorization", required = false) String authorization,
			@RequestBody ChangePasswordRequest body) {
		return ResponseEntity.ok(authService.changePassword(authorization, body));
	}
}
