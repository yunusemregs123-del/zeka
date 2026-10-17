# ZEKA Cloudflare Edge Worker & D1 Setup ⚡

ZEKA's edge worker provides ultra-low latency (<20ms), 0ms cold starts, and zero database bill up to 5,000+ concurrent players.

### Özellikler
- **Cloudflare Geo-Detection**: Oyuncunun ülkesini anında `request.cf.country` ile ücretsiz tespit eder (TR, US, DE, JP, vb.).
- **Cloudflare D1 SQL Veritabanı**: Serverless SQLite veritabanı.
- **30 Saniye Edge Cache**: Skor tablosu her sorguda veritabanını yormaz, Cloudflare CDN kenar noktalarında önbelleğe alınır.
- **Anti-Cheat Kontrolü**: Hileli seviye ve fiziksel olarak imkansız reaksiyon sürelerini kenarda eler.

---

### Kurulum ve Dağıtım (3 Kolay Adım)

#### 1. Cloudflare Girişi Yapın
Terminalde `worker` dizinine gidin ve giriş yapın:
```bash
cd worker
npx wrangler login
```

#### 2. D1 Veritabanını Oluşturun
```bash
npx wrangler d1 create zeka-db
```
Bu komut size bir `database_id` verecektir (örneğin: `xxxx-xxxx-xxxx-xxxx`).
`worker/wrangler.jsonc` dosyasındaki `REPLACE_WITH_YOUR_D1_DATABASE_ID` kısmını bu ID ile değiştirin.

Ardından tablo şemasını oluşturun:
```bash
npx wrangler d1 execute zeka-db --file=./schema.sql --remote
```

#### 3. Worker'ı Canlıya Alın
```bash
npx wrangler deploy
```
İşlem tamamlandığında Cloudflare size bir worker adresi verir (örneğin: `https://zeka-edge-api.kullanici-adi.workers.dev`).

#### 4. Ana Projeye Bağlayın
Projenin kök dizinindeki `.env` dosyasına (veya Vercel/Netlify çevre değişkenlerine) şu satırı ekleyin:
```env
VITE_CF_WORKER_URL=https://zeka-edge-api.zekagame.workers.dev
```
Artık tüm skorlar ve ülke tespitleri doğrudan Cloudflare Edge üzerinden ışık hızında çalışacaktır!
