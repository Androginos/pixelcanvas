# Multisynq Session Yönetimi

Bu proje, birden fazla kullanıcının aynı canvas üzerinde gerçek zamanlı olarak çizim yapabilmesi için Multisynq kullanır.

## Kurulum

### 1. Multisynq API Key'i Alın

1. [Multisynq.io](https://multisynq.io) adresine gidin
2. Ücretsiz hesap oluşturun
3. API key'inizi alın

### 2. Environment Variable'ı Ayarlayın

Proje kök dizininde `.env.local` dosyası oluşturun:

```bash
# Multisynq API Key
NEXT_PUBLIC_MULTISYNQ_API_KEY=your_api_key_here
```

### 3. Mock Mode (API Key Olmadan)

API key olmadan da test edebilirsiniz. Bu durumda mock mode kullanılır:

```bash
# .env.local dosyasında API key'i boş bırakın
NEXT_PUBLIC_MULTISYNQ_API_KEY=
```

## Session Yönetimi

### Session ID

Her canvas için benzersiz bir session ID kullanılır. Bu ID:
- URL'de görünür
- Kullanıcılar aynı session ID'sini paylaşarak aynı canvas'a katılabilir
- Session ID'si değiştirilerek yeni bir canvas oluşturulabilir

### Kullanıcı Katılımı

1. **Aynı Session'a Katılım:**
   - Kullanıcılar aynı URL'yi paylaşır
   - Otomatik olarak aynı session'a bağlanırlar
   - Gerçek zamanlı olarak birbirlerinin çizimlerini görürler

2. **Yeni Session Oluşturma:**
   - URL'deki session ID'sini değiştirin
   - Yeni bir canvas otomatik olarak oluşturulur

### Örnek Kullanım

```typescript
// Session'a katılım
const sessionId = 'my-canvas-123';
const userId = 'user-456';
const walletAddress = '0x123...';

// Component'te kullanım
<PixelPlaceCanvas
  sessionId={sessionId}
  userId={userId}
  walletAddress={walletAddress}
/>
```

## Gerçek Zamanlı Özellikler

### Pixel Senkronizasyonu
- Kullanıcılar pixel ekler/çıkarır
- Değişiklikler anında diğer kullanıcılara yansır
- Her pixel'in sahibi (owner) takip edilir

### Bağlantı Durumu
- Gerçek zamanlı bağlantı durumu gösterilir
- Bağlantı koptuğunda otomatik yeniden bağlanma
- Mock mode'da her zaman bağlı görünür

### Cooldown Sistemi
- Her kullanıcı için 1 saniye cooldown
- Spam'i önler
- Gerçek zamanlı olarak güncellenir

## Teknik Detaylar

### Model-View Mimarisi
- **Model:** Canvas state'ini yönetir (pixels, metadata)
- **View:** UI state'ini yönetir (colors, tools, zoom)
- **Session:** Model ve View arasında senkronizasyon

### Event Sistemi
```typescript
// Pixel güncellemesi
publishPixelUpdate({
  x: 100,
  y: 200,
  color: '#FF0000',
  owner: '0x123...',
  timestamp: Date.now()
});

// Pixel güncellemelerini dinleme
subscribeToPixelUpdates((pixelUpdate) => {
  // Pixel'i canvas'a ekle
});
```

### Mock Mode
API key olmadan:
- Gerçek Multisynq yerine local mock kullanılır
- Tek kullanıcı için çalışır
- Gerçek zamanlı özellikler simüle edilir

## Sorun Giderme

### Bağlantı Sorunları
1. API key'in doğru olduğundan emin olun
2. Network bağlantısını kontrol edin
3. Console'da hata mesajlarını kontrol edin

### Session Sorunları
1. Session ID'nin benzersiz olduğundan emin olun
2. Aynı session'a katılmak için URL'yi paylaşın
3. Browser'ı yenileyin

### Performans Sorunları
1. Çok fazla pixel varsa zoom out yapın
2. Cooldown süresini artırın
3. Canvas boyutunu küçültün

## Geliştirme

### Yeni Özellik Ekleme
1. Model'de state'i tanımlayın
2. View'da UI state'ini yönetin
3. Event'leri publish/subscribe edin
4. Component'te hook'u kullanın

### Test Etme
1. Mock mode'da test edin
2. Gerçek API key ile test edin
3. Birden fazla browser'da test edin
4. Network kesintilerini test edin 