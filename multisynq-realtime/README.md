# Multisynq Real-time Canvas

Gerçek zamanlı çok oyunculu canvas uygulaması - Multisynq + Monad testnet entegrasyonu

## 🚀 Özellikler

- **Real-time cursor tracking** - Diğer kullanıcıların cursor'larını gerçek zamanlı görün
- **Collaborative drawing** - Birlikte çizim yapın
- **Monad testnet wallet integration** - MetaMask ile güvenli bağlantı
- **Multisynq real-time sync** - Gerçek zamanlı veri senkronizasyonu
- **Responsive design** - Tüm cihazlarda çalışır

## 🛠️ Teknoloji Stack

- **Frontend**: Next.js 15.4.1 + TypeScript + Tailwind CSS
- **Real-time**: Multisynq Client
- **Blockchain**: Monad Testnet (Chain ID: 10143)
- **Wallet**: MetaMask integration
- **Deployment**: Vercel ready

## 📦 Kurulum

### 1. Repository'yi klonlayın
```bash
git clone <repository-url>
cd multisynq-realtime
```

### 2. Dependencies'leri yükleyin
```bash
npm install
```

### 3. Environment variables'ları ayarlayın
```bash
# .env.local dosyası oluşturun
cp .env.example .env.local
```

`.env.local` dosyasını düzenleyin:
```env
# Multisynq Configuration
NEXT_PUBLIC_MULTISYNQ_API_KEY=your_multisynq_api_key_here
NEXT_PUBLIC_MULTISYNQ_PROJECT_ID=your_project_id_here

# Environment
NODE_ENV=development
```

### 4. Development server'ı başlatın
```bash
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışacak.

## 🔑 Multisynq API Key

### API Key Alma
1. [Multisynq.io](https://multisynq.io) adresine gidin
2. Hesap oluşturun veya giriş yapın
3. Dashboard'dan API key alın
4. `.env.local` dosyasına ekleyin

### Test Modu
API key olmadan da uygulama çalışır (mock mode):
- Gerçek zamanlı özellikler simüle edilir
- Demo kullanıcılar (Alice, Bob, Charlie) otomatik hareket eder
- Tüm canvas özellikleri çalışır

## 🎮 Kullanım

### 1. Wallet Bağlantısı
- "Connect Wallet" butonuna tıklayın
- MetaMask'ta Monad testnet'e geçiş yapın
- Hesabınızı seçin

### 2. Canvas Kullanımı
- Mouse ile canvas'ta çizim yapın
- Diğer kullanıcıların cursor'larını gerçek zamanlı görün
- Çizimler otomatik olarak senkronize edilir

### 3. Real-time Özellikler
- **Cursor tracking**: 60 FPS ile optimize edilmiş
- **Drawing sync**: Stroke-based çizim senkronizasyonu
- **Session management**: Otomatik session ve user ID'ler

## 🏗️ Proje Yapısı

```
src/
├── app/
│   └── page.tsx              # Ana sayfa
├── components/
│   ├── MultiplayerCanvas.tsx # Canvas bileşeni
│   └── WalletConnection.tsx  # Wallet bağlantısı
├── lib/
│   └── multisynq.ts         # Multisynq client
└── types/
    └── multisynq.ts         # TypeScript tipleri
```

## 🔧 Development

### Scripts
```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint check
```

### Environment Variables
- `NEXT_PUBLIC_MULTISYNQ_API_KEY`: Multisynq API key
- `NEXT_PUBLIC_MULTISYNQ_PROJECT_ID`: Proje ID
- `NODE_ENV`: Environment (development/production)

## 🚀 Deployment

### Vercel (Önerilen)
1. Vercel hesabı oluşturun
2. GitHub repository'yi bağlayın
3. Environment variables'ları ayarlayın
4. Deploy edin

### Environment Variables (Production)
Vercel dashboard'da şu değişkenleri ayarlayın:
- `NEXT_PUBLIC_MULTISYNQ_API_KEY`
- `NEXT_PUBLIC_MULTISYNQ_PROJECT_ID`
- `NODE_ENV=production`

## 🔍 Troubleshooting

### Wallet Bağlantı Sorunları
- MetaMask'ın kurulu olduğundan emin olun
- Monad testnet'in eklendiğini kontrol edin
- Chain ID: 10143

### Real-time Sorunları
- API key'in doğru olduğunu kontrol edin
- Network bağlantınızı kontrol edin
- Browser console'da hataları kontrol edin

### Performance Sorunları
- Cursor tracking 60 FPS ile throttle edilir
- Canvas boyutu optimize edilmiştir
- Memory leak'ler önlenmiştir

## 📝 API Reference

### Multisynq Client
```typescript
// Session management
createSession(sessionId: string)
joinSession(sessionId: string, userId: string)

// Real-time sync
broadcast(sessionId: string, data: any)
syncState(sessionId: string, key: string, data: any)
publish(sessionId: string, event: any)
```

### Canvas Events
```typescript
// Cursor events
cursor-update: CursorData

// Drawing events
stroke-add: DrawingStroke
drawing-start: DrawingPoint
drawing-end: void
```

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🔗 Linkler

- [Multisynq Documentation](https://multisynq.io/docs)
- [Monad Testnet](https://monad.xyz)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)

---

**Built with ❤️ using Multisynq + Monad + Next.js**
