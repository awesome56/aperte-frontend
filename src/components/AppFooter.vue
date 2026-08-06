<template>
  <footer class="footer">
    <div class="container footer-grid">
      <div class="col">
        <div class="brand">
          <span class="brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 3 2 12h3v8h6v-6h2v6h6v-8h3L12 3z" fill="currentColor" />
            </svg>
          </span>
          Aperte
        </div>
        <p class="about">
          Assisting individuals in locating the appropriate real estate. Buy, sell and rent homes,
          hotels, shortlets, halls and event centers.
        </p>
        <div class="contact">
          <span>support@aperte.com.ng</span>
          <span>+1 206-214-2298</span>
          <span>18 Grattan St, Brooklyn</span>
        </div>
      </div>

      <div class="col">
        <h4>Quick Links</h4>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/#about">About</RouterLink>
        <RouterLink to="/listings">Listings</RouterLink>
        <RouterLink to="/#services">Services</RouterLink>
        <RouterLink to="/#testimonials">Reviews</RouterLink>
      </div>

      <div class="col">
        <h4>Discovery</h4>
        <RouterLink to="/listings?purpose=rent">For Rent</RouterLink>
        <RouterLink to="/listings?purpose=sale">For Sale</RouterLink>
        <RouterLink to="/listings?category=hotel">Hotels</RouterLink>
        <RouterLink to="/listings?category=shortlet">Shortlets</RouterLink>
        <RouterLink to="/listings?category=land">Land</RouterLink>
      </div>

      <div class="col">
        <h4>Subscribe to our Newsletter!</h4>
        <p class="newsletter-desc">Get the latest listings and market updates.</p>
        <form class="newsletter" @submit.prevent>
          <input class="form-control" type="email" placeholder="Email Address" />
          <button class="btn btn-primary btn-sm" type="submit">Subscribe</button>
        </form>
      </div>
    </div>

    <div class="container footer-bottom">
      <span>© {{ new Date().getFullYear() }} Aperte – All rights reserved</span>
      <div class="legal">
        <a href="#">Terms and Conditions</a>
        <a href="#">Privacy Policy</a>
        <a href="#">Disclaimer</a>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  background: var(--color-purple-dark);
  color: #cfd3e6;
  padding: 70px 0 0;
  margin-top: 40px;
}

.footer-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1.3fr;
  gap: 40px;
  padding-bottom: 50px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.4rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 16px;
}

.brand-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--color-primary);
  color: #fff;
}

.about {
  font-size: 0.95rem;
  line-height: 1.7;
  margin-bottom: 20px;
  max-width: 300px;
}

.contact {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.9rem;
}

.col h4 {
  color: #fff;
  font-size: 1.05rem;
  font-weight: 600;
  margin-bottom: 18px;
}

.col a {
  display: block;
  color: #cfd3e6;
  margin-bottom: 10px;
  font-size: 0.95rem;
  transition: color 0.2s;
}

.col a:hover {
  color: #fff;
}

.newsletter-desc {
  font-size: 0.9rem;
  margin-bottom: 14px;
}

.newsletter {
  display: flex;
  gap: 10px;
}

.newsletter .form-control {
  background: rgba(255, 255, 255, 0.08);
  border-color: transparent;
  color: #fff;
}

.newsletter .form-control::placeholder {
  color: #9aa2bd;
}

.footer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 24px;
  padding-bottom: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 0.85rem;
}

.legal {
  display: flex;
  gap: 20px;
}

.legal a {
  color: #cfd3e6;
}

@media (max-width: 900px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 600px) {
  .footer-grid {
    grid-template-columns: 1fr;
  }
  .footer-bottom {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
