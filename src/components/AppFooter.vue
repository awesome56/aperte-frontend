<template>
  <footer class="footer">
    <div class="container footer-grid">
      <div class="col">
        <RouterLink to="/" class="f-brand">Aperte</RouterLink>
        <p class="f-addr">2728 Hickory Street<br/>Salt Lake City, UT 84104</p>
      </div>

      <div class="col">
        <h4>Quick Links</h4>
        <a href="/">Home</a><a href="/#about">About</a><a href="/listings">Listings</a><a href="/#services">Services</a><a href="/listings">Blogs</a><a href="/listings">Become a Agent</a>
      </div>

      <div class="col">
        <h4>Discovery</h4>
        <a href="/listings?country=Canada">Canada</a><a href="/listings?country=United+States">United States</a><a href="/listings?country=Germany">Germany</a><a href="/listings?country=Africa">Africa</a><a href="/listings?country=India">India</a>
      </div>

      <div class="col">
        <h4>Subscribe to our Newsletter!</h4>
        <form class="sub-form" @submit.prevent>
          <input class="fc" type="email" placeholder="Email Address" />
          <button class="btn btn-primary" type="submit">Subscribe</button>
        </form>
        <p class="follow">Follow Us on</p>
      </div>
    </div>

    <div class="footer-bottom">
      <div class="container fb-inner">
        <span>© Aperte – All rights reserved</span>
        <div class="legal"><a href="#">Terms and Conditions</a><a href="#">Privacy Policy</a><a href="#">Disclaimer</a></div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer { background: var(--clr-blue2); padding-top: 70px; }
.footer-grid { display: grid; grid-template-columns: 1.3fr 1fr 1fr 1.4fr; gap: 40px; padding-bottom: 50px; }
.f-brand { font-size: 1.25rem; font-weight: 600; color: var(--clr-black); display: block; margin-bottom: 14px; }
.f-addr { color: var(--clr-dark); font-weight: 500; line-height: 1.7; }

.col h4 { color: var(--clr-black); font-size: 1.2rem; font-weight: 500; margin-bottom: 14px; }
.col a { display: block; color: var(--clr-dark); margin-bottom: 6px; font-weight: 400; }
.col a:hover { color: #fff; }

.sub-form { display: flex; gap: 8px; }
.fc { padding: 11px 14px; border: none; border-radius: 6px; font-size: 1rem; flex: 1; min-width: 0; }
.follow { margin-top: 14px; color: var(--clr-black); font-weight: 500; }

.footer-bottom { background: var(--clr-black); }
.fb-inner { display: flex; justify-content: space-between; align-items: center; padding: 18px 0; }
.fb-inner span { color: var(--clr-light); font-size: 0.95rem; }
.legal { display: flex; gap: 20px; }
.legal a { color: var(--clr-light); font-size: 0.95rem; }
.legal a:hover { color: #fff; }

@media (max-width: 800px) { .footer-grid { grid-template-columns: 1fr 1fr; } .fb-inner { flex-direction: column; gap: 10px; } }
@media (max-width: 500px) { .footer-grid { grid-template-columns: 1fr; } }
</style>
