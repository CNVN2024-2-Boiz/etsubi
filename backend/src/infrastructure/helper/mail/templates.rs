//! Nội dung 3 loại mail theo ngôn ngữ giao diện của người dùng (vi, ja, en).
//! Khung HTML chung nằm ở `layout.html`: bảng và style inline để Gmail, Outlook hiển thị đúng.

use chrono::{DateTime, FixedOffset, Utc};

use super::OutgoingMail;

const LAYOUT: &str = include_str!("layout.html");

const FONT: &str = "'Be Vietnam Pro',Arial,Helvetica,sans-serif";
const H1: &str = "margin:0 0 12px;font-size:22px;line-height:1.35;font-weight:700;color:#1F1A17;";
const P: &str = "margin:0 0 16px;";
const SMALL: &str = "margin:0 0 20px;font-size:13px;color:#80736B;";
const STRONG: &str = "color:#1F1A17;";

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Lang {
    Vi,
    Ja,
    En,
}

impl Lang {
    /// Ngôn ngữ lưu trong cột `users.language`; giá trị lạ dùng tiếng Việt.
    pub fn from_code(code: &str) -> Self {
        match code {
            "ja" => Lang::Ja,
            "en" => Lang::En,
            _ => Lang::Vi,
        }
    }

    fn code(self) -> &'static str {
        match self {
            Lang::Vi => "vi",
            Lang::Ja => "ja",
            Lang::En => "en",
        }
    }

    /// Chọn chuỗi theo ngôn ngữ.
    fn t(self, vi: &'static str, ja: &'static str, en: &'static str) -> &'static str {
        match self {
            Lang::Vi => vi,
            Lang::Ja => ja,
            Lang::En => en,
        }
    }
}

/// Thông tin đồng ý in trong mail xác nhận, để người dùng giữ một bản.
pub struct ConsentSummary {
    pub terms_version: String,
    pub privacy_version: String,
    pub granted_at: DateTime<Utc>,
}

/// Thoát ký tự HTML cho dữ liệu người dùng nhập (tên hiển thị) trước khi chèn vào mail.
pub fn escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

/// Giờ Việt Nam (UTC+7), định dạng theo từng ngôn ngữ.
pub fn format_time(lang: Lang, at: DateTime<Utc>) -> String {
    let vn = at.with_timezone(&FixedOffset::east_opt(7 * 3600).expect("valid offset"));
    match lang {
        Lang::Vi => format!("{} (giờ Việt Nam)", vn.format("%H:%M, %d/%m/%Y")),
        Lang::Ja => format!("{}（ベトナム時間）", vn.format("%Y年%m月%d日 %H:%M")),
        Lang::En => format!("{} (Vietnam time)", vn.format("%d %b %Y, %H:%M")),
    }
}

fn button(label: &str, href: &str, solid: bool) -> String {
    let (bg, fg) = if solid {
        ("#B23C46", "#FFFFFF")
    } else {
        ("#F7EBEA", "#8E2F38")
    };
    format!(
        r#"<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="btn" style="margin:4px 0 16px;"><tr><td style="border-radius:8px;background:{bg};"><a href="{href}" style="display:inline-block;padding:12px 24px;border:1px solid {bg};border-radius:8px;font-family:{FONT};font-size:15px;font-weight:600;color:{fg};text-decoration:none;">{label}</a></td></tr></table>"#,
        href = escape(href),
    )
}

fn boxed(inner: &str, warning: bool) -> String {
    let (bg, border) = if warning {
        ("#F7EBEA", "#EFD3D5")
    } else {
        ("#F4EEE8", "#E0D9CC")
    };
    format!(
        r#"<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;background:{bg};border:1px solid {border};border-radius:8px;"><tr><td style="padding:16px 18px;font-size:14px;line-height:1.6;color:#4A403B;">{inner}</td></tr></table>"#
    )
}

fn fallback(lang: Lang, url: &str) -> String {
    let label = lang.t(
        "Nếu nút không bấm được, hãy mở liên kết này:",
        "ボタンが押せない場合は、次のリンクを開いてください：",
        "If the button does not work, open this link:",
    );
    let url = escape(url);
    format!(
        r#"<p style="{SMALL}">{label}<br><a href="{url}" style="color:#B23C46;word-break:break-all;">{url}</a></p>"#
    )
}

struct Page<'a> {
    lang: Lang,
    base_url: &'a str,
    subject: String,
    preheader: String,
    content: String,
    footer_note: &'static str,
}

fn render(page: Page, to: &str, text: String) -> OutgoingMail {
    let lang = page.lang;
    let base = escape(page.base_url);
    let html = LAYOUT
        .replace("{{lang}}", lang.code())
        .replace("{{subject}}", &escape(&page.subject))
        .replace("{{preheader}}", &escape(&page.preheader))
        .replace("{{logo_url}}", &format!("{base}/assets/email/etsubi-wordmark.png"))
        .replace("{{base_url}}", &base)
        .replace("{{footer_note}}", page.footer_note)
        .replace("{{terms_label}}", lang.t("Điều khoản sử dụng", "利用規約", "Terms of Use"))
        .replace("{{privacy_label}}", lang.t("Quyền riêng tư", "プライバシー", "Privacy"))
        .replace(
            "{{tagline}}",
            lang.t(
                "Cầu nối văn hoá Việt – Nhật",
                "ベトナムと日本をつなぐ文化の架け橋",
                "A bridge between Vietnamese and Japanese culture",
            ),
        )
        // Nội dung chèn sau cùng để chuỗi `{{...}}` người dùng gõ không bị thay lần nữa.
        .replace("{{content}}", &page.content);

    OutgoingMail {
        to: to.to_string(),
        subject: page.subject,
        html,
        text,
    }
}

/// Mail xác nhận email sau khi đăng ký, kèm bản ghi đồng ý.
pub fn verify_email(
    lang: Lang,
    base_url: &str,
    to: &str,
    displayname: &str,
    username: &str,
    link: &str,
    consent: &ConsentSummary,
) -> OutgoingMail {
    let name = escape(displayname);
    let user = escape(username);
    let time = format_time(lang, consent.granted_at);
    let tv = escape(&consent.terms_version);
    let pv = escape(&consent.privacy_version);

    let subject = lang
        .t(
            "Xác nhận email để bắt đầu dùng Etsubi",
            "Etsubiのメールアドレスを確認してください",
            "Confirm your email to start using Etsubi",
        )
        .to_string();
    let preheader = match lang {
        Lang::Vi => format!("Bấm nút trong 24 giờ để kích hoạt tài khoản @{username}."),
        Lang::Ja => format!("24時間以内にボタンを押して @{username} を有効にしてください。"),
        Lang::En => format!("Press the button within 24 hours to activate @{username}."),
    };
    let heading = match lang {
        Lang::Vi => format!("Chào {name}, chào mừng đến Etsubi!"),
        Lang::Ja => format!("{name}さん、Etsubiへようこそ！"),
        Lang::En => format!("Hi {name}, welcome to Etsubi!"),
    };
    let intro = match lang {
        Lang::Vi => format!(
            r#"Bạn vừa tạo tài khoản <strong style="{STRONG}">@{user}</strong>. Hãy xác nhận đây là email của bạn để bắt đầu đăng nhập và lấy lại mật khẩu khi cần."#
        ),
        Lang::Ja => format!(
            r#"アカウント <strong style="{STRONG}">@{user}</strong> が作成されました。ログインを始めるため、このメールアドレスがご本人のものであることを確認してください。パスワードを忘れたときの再設定にも使います。"#
        ),
        Lang::En => format!(
            r#"You just created the account <strong style="{STRONG}">@{user}</strong>. Please confirm this is your email address so you can sign in and recover your password if you ever need to."#
        ),
    };
    let rows = [
        (
            lang.t("Điều khoản sử dụng", "利用規約", "Terms of Use"),
            match lang {
                Lang::Vi => format!("Phiên bản {tv}, gồm xác nhận bạn đủ 16 tuổi"),
                Lang::Ja => format!("バージョン{tv}（16歳以上であることの確認を含む）"),
                Lang::En => format!("Version {tv}, including confirming you are at least 16"),
            },
        ),
        (
            lang.t("Quyền riêng tư", "プライバシーポリシー", "Privacy Policy"),
            match lang {
                Lang::Vi => format!("Phiên bản {pv}, đồng ý xử lý dữ liệu cá nhân"),
                Lang::Ja => format!("バージョン{pv}（個人データの処理に同意）"),
                Lang::En => format!("Version {pv}, consent to personal data processing"),
            },
        ),
        (lang.t("Thời điểm", "日時", "Time"), escape(&time)),
    ];
    let rows_html: String = rows
        .iter()
        .map(|(k, v)| {
            format!(
                r#"<tr><td style="padding:4px 14px 4px 0;color:#1F1A17;font-weight:600;vertical-align:top;white-space:nowrap;">{k}</td><td style="padding:4px 0;color:#4A403B;vertical-align:top;">{v}</td></tr>"#
            )
        })
        .collect();
    let withdraw = lang.t(
        "Bạn có thể rút lại sự đồng ý bất cứ lúc nào bằng cách xoá tài khoản trong Cài đặt hoặc gửi email tới contact@etsubi.net.",
        "同意はいつでも撤回できます。設定からアカウントを削除するか、contact@etsubi.net までご連絡ください。",
        "You can withdraw your consent at any time by deleting your account in Settings or emailing contact@etsubi.net.",
    );
    let consent_box = boxed(
        &format!(
            r#"<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;line-height:1.5;">{rows_html}</table><p style="margin:10px 0 0;font-size:13px;color:#80736B;">{withdraw}</p>"#
        ),
        false,
    );

    let content = format!(
        r#"<h1 style="{H1}font-family:{FONT};">{heading}</h1>
<p style="{P}">{intro}</p>
{button}
<p style="{SMALL}">{validity}</p>
<p style="margin:0 0 6px;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#8E2F38;">{consent_title}</p>
{consent_box}
{fallback}
<p style="{SMALL}">{ignore}</p>"#,
        button = button(lang.t("Xác nhận email", "メールアドレスを確認", "Confirm email"), link, true),
        validity = lang.t(
            "Nút có hiệu lực trong 24 giờ.",
            "このボタンの有効期限は24時間です。",
            "The button works for 24 hours."
        ),
        consent_title = lang.t("Bản ghi đồng ý của bạn", "同意の記録", "Your consent record"),
        fallback = fallback(lang, link),
        ignore = lang.t(
            "Nếu bạn không tạo tài khoản này, hãy bỏ qua email. Tài khoản chưa xác nhận sẽ không đăng nhập được.",
            "このアカウントに心当たりがない場合は、このメールを無視してください。確認されていないアカウントではログインできません。",
            "If you did not create this account, you can ignore this email. Unconfirmed accounts cannot sign in.",
        ),
    );

    let text = format!(
        "{heading_plain}\n\n{intro_plain}\n\n{link}\n\n{consent_title}:\n- {r0}: {v0}\n- {r1}: {v1}\n- {r2}: {time}\n\n{withdraw}\n",
        heading_plain = match lang {
            Lang::Vi => format!("Chào {displayname}, chào mừng đến Etsubi!"),
            Lang::Ja => format!("{displayname}さん、Etsubiへようこそ！"),
            Lang::En => format!("Hi {displayname}, welcome to Etsubi!"),
        },
        intro_plain = lang.t(
            "Mở liên kết sau trong 24 giờ để xác nhận email:",
            "24時間以内に次のリンクを開いて、メールアドレスを確認してください：",
            "Open this link within 24 hours to confirm your email:",
        ),
        consent_title = lang.t("Bản ghi đồng ý của bạn", "同意の記録", "Your consent record"),
        r0 = rows[0].0,
        v0 = rows[0].1,
        r1 = rows[1].0,
        v1 = rows[1].1,
        r2 = rows[2].0,
    );

    render(
        Page {
            lang,
            base_url,
            subject,
            preheader,
            content,
            footer_note: lang.t(
                "Bạn nhận email này vì vừa đăng ký tài khoản trên etsubi.net. Đây là email tự động, vui lòng không trả lời.",
                "etsubi.net でアカウントが登録されたため、このメールをお送りしています。このメールは送信専用です。",
                "You received this email because this address was used to sign up on etsubi.net. This is an automated message; please do not reply.",
            ),
        },
        to,
        text,
    )
}

/// Mail chứa link đặt lại mật khẩu.
pub fn reset_password(lang: Lang, base_url: &str, to: &str, username: &str, link: &str) -> OutgoingMail {
    let user = escape(username);
    let subject = lang
        .t("Đặt lại mật khẩu Etsubi", "Etsubiのパスワード再設定", "Reset your Etsubi password")
        .to_string();
    let intro = match lang {
        Lang::Vi => format!(
            r#"Etsubi vừa nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong style="{STRONG}">@{user}</strong>. Bấm nút bên dưới để chọn mật khẩu mới."#
        ),
        Lang::Ja => format!(
            r#"アカウント <strong style="{STRONG}">@{user}</strong> のパスワード再設定のリクエストを受け付けました。下のボタンから新しいパスワードを設定してください。"#
        ),
        Lang::En => format!(
            r#"We received a request to reset the password for <strong style="{STRONG}">@{user}</strong>. Press the button below to choose a new password."#
        ),
    };
    let not_you = format!(
        r#"<strong style="{STRONG}">{title}</strong><br>{body}"#,
        title = lang.t("Không phải bạn yêu cầu?", "心当たりがない場合", "Didn't ask for this?"),
        body = lang.t(
            "Cứ bỏ qua email này, mật khẩu hiện tại vẫn giữ nguyên. Không ai đổi được mật khẩu nếu không mở được hộp thư của bạn.",
            "このメールは無視してください。現在のパスワードはそのまま使えます。メールボックスを開けない限り、誰もパスワードを変更できません。",
            "Just ignore this email and your current password stays the same. Nobody can change it without access to your inbox.",
        ),
    );
    let validity = lang.t(
        "Liên kết chỉ dùng được một lần và hết hạn sau 30 phút.",
        "このリンクは1回のみ有効で、30分後に期限切れになります。",
        "The link can be used once and expires in 30 minutes.",
    );
    let content = format!(
        r#"<h1 style="{H1}font-family:{FONT};">{heading}</h1>
<p style="{P}">{intro}</p>
{button}
<p style="{SMALL}">{validity}</p>
{box_}
{fallback}"#,
        heading = lang.t("Đặt lại mật khẩu", "パスワードの再設定", "Reset your password"),
        button = button(
            lang.t("Đặt mật khẩu mới", "新しいパスワードを設定", "Choose a new password"),
            link,
            true
        ),
        box_ = boxed(&not_you, false),
        fallback = fallback(lang, link),
    );
    let text = format!(
        "{}\n\n{}\n\n{link}\n\n{validity}\n",
        lang.t("Đặt lại mật khẩu", "パスワードの再設定", "Reset your password"),
        match lang {
            Lang::Vi => format!("Mở liên kết sau để đặt mật khẩu mới cho @{username}:"),
            Lang::Ja => format!("次のリンクから @{username} の新しいパスワードを設定してください："),
            Lang::En => format!("Open this link to choose a new password for @{username}:"),
        },
    );

    render(
        Page {
            lang,
            base_url,
            preheader: lang
                .t(
                    "Liên kết đặt lại mật khẩu, hết hạn sau 30 phút.",
                    "パスワード再設定用のリンクです（30分で期限切れ）。",
                    "Your password reset link expires in 30 minutes.",
                )
                .to_string(),
            subject,
            content,
            footer_note: lang.t(
                "Bạn nhận email này vì có người nhập địa chỉ của bạn ở trang Quên mật khẩu. Đây là email tự động, vui lòng không trả lời.",
                "パスワード再設定のページでこのメールアドレスが入力されたため、お送りしています。このメールは送信専用です。",
                "You received this email because someone entered this address on the Forgot password page. This is an automated message; please do not reply.",
            ),
        },
        to,
        text,
    )
}

/// Thông báo bảo mật: mật khẩu vừa được đổi.
pub fn password_changed(
    lang: Lang,
    base_url: &str,
    to: &str,
    username: &str,
    at: DateTime<Utc>,
) -> OutgoingMail {
    let user = escape(username);
    let time = escape(&format_time(lang, at));
    let subject = lang
        .t(
            "Mật khẩu Etsubi của bạn vừa được đổi",
            "Etsubiのパスワードが変更されました",
            "Your Etsubi password was changed",
        )
        .to_string();
    let intro = match lang {
        Lang::Vi => format!(
            r#"Mật khẩu của tài khoản <strong style="{STRONG}">@{user}</strong> vừa được đổi lúc <strong style="{STRONG}">{time}</strong>. Mọi phiên đăng nhập cũ đã bị đăng xuất."#
        ),
        Lang::Ja => format!(
            r#"アカウント <strong style="{STRONG}">@{user}</strong> のパスワードが <strong style="{STRONG}">{time}</strong> に変更されました。以前のログインはすべてログアウトされています。"#
        ),
        Lang::En => format!(
            r#"The password for <strong style="{STRONG}">@{user}</strong> was changed at <strong style="{STRONG}">{time}</strong>. All previous sessions have been signed out."#
        ),
    };
    let not_you = format!(
        r#"<strong style="color:#8E2F38;">{title}</strong><br>{body}"#,
        title = lang.t("Không phải bạn?", "心当たりがない場合", "Wasn't you?"),
        body = lang.t(
            "Hãy đặt lại mật khẩu ngay và báo cho đội ngũ qua contact@etsubi.net để được hỗ trợ khoá tài khoản.",
            "すぐにパスワードを再設定し、contact@etsubi.net までご連絡ください。アカウントの保護をお手伝いします。",
            "Reset your password right away and let the team know at contact@etsubi.net so we can help secure your account.",
        ),
    );
    let reset_url = format!("{base_url}/reset-password/");
    let content = format!(
        r#"<h1 style="{H1}font-family:{FONT};">{heading}</h1>
<p style="{P}">{intro}</p>
<p style="{P}">{fine}</p>
{box_}
{button}"#,
        heading = lang.t("Mật khẩu đã được đổi", "パスワードが変更されました", "Your password was changed"),
        fine = lang.t(
            "Nếu chính bạn vừa đổi, bạn không cần làm gì thêm.",
            "ご自身で変更した場合は、何もする必要はありません。",
            "If this was you, there is nothing else to do.",
        ),
        box_ = boxed(&not_you, true),
        button = button(
            lang.t("Đặt lại mật khẩu", "パスワードを再設定", "Reset password"),
            &reset_url,
            false
        ),
    );
    let plain_time = format_time(lang, at);
    let text = match lang {
        Lang::Vi => format!(
            "Mật khẩu của tài khoản @{username} vừa được đổi lúc {plain_time}.\n\nKhông phải bạn? Đặt lại mật khẩu tại {reset_url} và báo cho contact@etsubi.net.\n"
        ),
        Lang::Ja => format!(
            "アカウント @{username} のパスワードが {plain_time} に変更されました。\n\n心当たりがない場合は {reset_url} から再設定し、contact@etsubi.net までご連絡ください。\n"
        ),
        Lang::En => format!(
            "The password for @{username} was changed at {plain_time}.\n\nWasn't you? Reset it at {reset_url} and contact contact@etsubi.net.\n"
        ),
    };

    render(
        Page {
            lang,
            base_url,
            preheader: match lang {
                Lang::Vi => format!("Mật khẩu tài khoản @{username} vừa được đổi lúc {plain_time}."),
                Lang::Ja => format!("@{username} のパスワードが {plain_time} に変更されました。"),
                Lang::En => format!("The password for @{username} was changed at {plain_time}."),
            },
            subject,
            content,
            footer_note: lang.t(
                "Đây là thông báo bảo mật tự động gửi tới email đăng ký của tài khoản. Vui lòng không trả lời email này.",
                "アカウントに登録されたメールアドレスへ自動送信されるセキュリティ通知です。このメールは送信専用です。",
                "This is an automated security notice sent to the email address on the account. Please do not reply.",
            ),
        },
        to,
        text,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn consent() -> ConsentSummary {
        ConsentSummary {
            terms_version: "1.0".into(),
            privacy_version: "1.1".into(),
            granted_at: DateTime::parse_from_rfc3339("2026-11-28T07:05:00Z")
                .unwrap()
                .with_timezone(&Utc),
        }
    }

    #[test]
    fn verify_mail_escapes_name_and_uses_vietnam_time() {
        let m = verify_email(
            Lang::Vi,
            "https://etsubi.net",
            "a@b.c",
            "<script>Nhân</script>",
            "shirotrang",
            "https://etsubi.net/verify-email/?token=abc",
            &consent(),
        );
        assert!(m.html.contains("&lt;script&gt;Nhân&lt;/script&gt;"));
        assert!(!m.html.contains("<script>"));
        assert!(m.html.contains("14:05, 28/11/2026 (giờ Việt Nam)"));
        assert!(m.html.contains("verify-email/?token=abc"));
        assert!(!m.html.contains("{{"));
    }

    #[test]
    fn every_language_fills_the_layout() {
        for lang in [Lang::Vi, Lang::Ja, Lang::En] {
            let at = consent().granted_at;
            for m in [
                verify_email(lang, "https://x", "a@b.c", "N", "u", "https://x/v", &consent()),
                reset_password(lang, "https://x", "a@b.c", "u", "https://x/r"),
                password_changed(lang, "https://x", "a@b.c", "u", at),
            ] {
                assert!(!m.html.contains("{{"), "{lang:?}: {}", m.subject);
                assert!(m.html.contains(&format!("lang=\"{}\"", lang.code())));
                assert!(!m.text.is_empty());
            }
        }
    }
}
