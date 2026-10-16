const VERIFICATION_HTML: &str = include_str!("templates/verification.html");
const VERIFICATION_TXT: &str = include_str!("templates/verification.txt");

pub struct VerificationEmail {
    pub html: String,
    pub text: String,
}

pub fn render_verification(link: &str) -> VerificationEmail {
    VerificationEmail {
        html: VERIFICATION_HTML.replace("{{link}}", link),
        text: VERIFICATION_TXT.replace("{{link}}", link),
    }
}
