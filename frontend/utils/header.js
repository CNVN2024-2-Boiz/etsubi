import { auth, LOGIN_URL, REGISTER_URL, HOME_URL } from './auth.js';

// Vẽ thanh điều hướng vào phần tử <header>, hiển thị theo trạng thái đăng nhập
export async function renderHeader(headerEl) {
  const user = await auth.fetchCurrentUser();
  headerEl.innerHTML = '';

  const nav = document.createElement('nav');
  nav.className = 'nav';

  const add = (text, href) => {
    const a = document.createElement('a');
    a.textContent = text;
    a.href = href;
    nav.appendChild(a);
  };

  add('Etsubi 越日', HOME_URL);
  add('Giới thiệu', '/pages/about.html');

  const spacer = document.createElement('span');
  spacer.className = 'spacer';
  nav.appendChild(spacer);

  if (user) {
    const who = document.createElement('span');
    who.textContent = `${user.username} (${user.role})`;
    nav.appendChild(who);

    const btn = document.createElement('button');
    btn.textContent = 'Đăng xuất';
    btn.addEventListener('click', () => auth.logout());
    nav.appendChild(btn);
  } else {
    const back = encodeURIComponent(location.pathname + location.search);
    add('Đăng nhập', `${LOGIN_URL}?redirect=${back}`);
    add('Đăng ký', `${REGISTER_URL}?redirect=${back}`);
  }

  headerEl.appendChild(nav);
  return user;
}
