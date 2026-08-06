resource "google_compute_security_policy" "vaultguard_waf" {
  name        = "vaultguard-waf-policy"
  description = "VaultGuard Cloud Armor WAF policy enforcing OWASP SQLi, XSS protection & rate limits"

  # Rule 1000: Block SQL Injection Attacks (OWASP ModSecurity Core Rule Set v3.3)
  rule {
    action   = "deny(403)"
    priority = 1000
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('sqli-v33-stable')"
      }
    }
    description = "Block OWASP SQL injection attempts"
  }

  # Rule 1001: Block Cross-Site Scripting Attacks (XSS)
  rule {
    action   = "deny(403)"
    priority = 1001
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('xss-v33-stable')"
      }
    }
    description = "Block OWASP XSS attempts"
  }

  # Rule 1002: Rate Limiting Protection (Max 100 requests per 60s per IP)
  rule {
    action   = "rate_based_ban"
    priority = 1002
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"
      rate_limit_threshold {
        count        = 100
        interval_sec = 60
      }
      ban_threshold {
        count        = 150
        interval_sec = 60
      }
      ban_duration_sec = 300
    }
    description = "Enforce rate limiting and automatic IP ban on abuse"
  }

  # Default Rule: Allow traffic
  rule {
    action   = "allow"
    priority = 2147483647
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default allow rule"
  }

  depends_on = [google_project_service.apis]
}
