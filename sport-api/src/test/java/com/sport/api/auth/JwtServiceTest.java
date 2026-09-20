package com.sport.api.auth;

import com.sport.api.config.JwtProperties;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

	@Test
	void createsAndParsesToken() {
		JwtProperties props = new JwtProperties();
		props.setSecret("unit-test-secret-that-is-at-least-32-bytes");
		JwtService service = new JwtService(props);

		String token = service.createToken(42L, "runner");

		assertThat(service.parse(token))
				.hasValueSatisfying(claims -> {
					assertThat(claims.getSubject()).isEqualTo("42");
					assertThat(claims.get("username")).isEqualTo("runner");
				});
	}

	@Test
	void rejectsShortSecretAtStartup() {
		JwtProperties props = new JwtProperties();
		props.setSecret("short-secret");

		assertThatThrownBy(() -> new JwtService(props))
				.isInstanceOf(IllegalStateException.class)
				.hasMessageContaining("32 bytes");
	}
}
