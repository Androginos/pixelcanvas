# 🎨 Monad Canvas - Gerçek Zamanlı Çok Oyunculu Canvas

Multisynq framework'ü kullanarak geliştirilmiş, Monad testnet üzerinde çalışan gerçek zamanlı çok oyunculu canvas uygulaması.

## 🌟 Özellikler

- **Gerçek Zamanlı Cursor Senkronizasyonu**: Diğer kullanıcıların mouse hareketlerini anlık olarak görün
- **Multisynq Framework**: Sunucu kodu yazmadan çoklu kullanıcı deneyimi
- **Web3 Entegrasyonu**: Monad testnet üzerinden cüzdan bağlantısı
- **Modern UI**: Tailwind CSS ile responsive tasarım
- **TypeScript**: Tip güvenli geliştirme deneyimi

## 🚀 Kurulum

### Gereksinimler

- Node.js (v16+ önerilir)
- MetaMask veya uyumlu Web3 cüzdan
- Monad testnet erişimi

### Adımlar

1. **Projeyi klonlayın**
   ```bash
   git clone <repo-url>
   cd multisynq-canvas
   ```

2. **Bağımlılıkları yükleyin**
   ```bash
   npm install
   ```

3. **Geliştirme sunucusunu başlatın**
   ```bash
   npm run dev
   ```

4. **Tarayıcıda açın**
   - http://localhost:5173 adresine gidin
   - MetaMask ile Monad testnet'e bağlanın

## 🔧 Yapılandırma

### Environment Variables

`.env` dosyası oluşturun:

```env
VITE_MULTISYNQ_API_KEY=your-multisynq-api-key
VITE_APP_NAME=MonadCanvas
VITE_SESSION_NAME=monad-canvas-shared
```

### Monad Testnet Ayarları

Ağ Adı: `Monad Testnet`
Chain ID: `41454`
RPC URL: `https://testnet1.monad.xyz`
Symbol: `MON`

## 📁 Proje Yapısı

```
src/
├── App.tsx                 # Ana uygulama komponenti
├── components/
│   └── MultiplayerCanvas.tsx   # Canvas ve cursor senkronizasyonu
├── multisynq/
│   ├── client.ts           # Multisynq konfigürasyonu
│   └── types.ts            # TypeScript tip tanımları
└── main.tsx               # Uygulama giriş noktası
```

## 🎮 Kullanım

1. **Cüzdan Bağlantısı**
   - MetaMask'ta Monad testnet ağını ekleyin
   - "Monad Testnet'e Bağlan" butonuna tıklayın
   - Cüzdan bağlantısını onaylayın

2. **Canvas Kullanımı**
   - Cursor'ınızı canvas üzerinde hareket ettirin
   - Diğer kullanıcıların cursor'larını gerçek zamanlı olarak görün
   - Sol üstte bağlantı durumunu kontrol edin
   - Sağ altta aktif kullanıcı sayısını görün

## 🛠️ Teknoloji Stack'i

| Katman | Teknoloji | Amaç |
|--------|-----------|-------|
| Frontend | React + TypeScript | Ana uygulama |
| Realtime | Multisynq | Cursor senkronizasyonu |
| Web3 | Viem | Monad testnet bağlantısı |
| UI | Tailwind CSS | Modern stil |
| Canvas | HTML5 Canvas | Çizim alanı |
| Build | Vite | Hızlı geliştirme |

## 🔄 Multisynq Entegrasyonu

Bu proje [Multisynq](https://docs.multisynq.io/) framework'ünü kullanır:

- **Model-View-Synchronizer**: Merkezi state yönetimi
- **Real-time Sync**: Otomatik state senkronizasyonu
- **Conflict Resolution**: Akıllı çakışma çözümü
- **Scalable**: Prototipten production'a ölçeklenebilir

### Multisynq React Hook API Kullanımı

Bu proje Multisynq'ün **React Hook API**'sini kullanır. İşte gerçek kullanım örnekleri:

#### 1. Provider Kurulumu

```typescript
import { createMultisynqProvider } from 'multisynq-react';

const MultisynqProvider = createMultisynqProvider({
  appName: 'MonadCanvas',
  sessionName: 'shared-canvas',
  apiKey: process.env.VITE_MULTISYNQ_API_KEY,
  synchronizerUrl: 'wss://sync.multisynq.io'
});

function App() {
  return (
    <MultisynqProvider>
      <YourApp />
    </MultisynqProvider>
  );
}
```

#### 2. useMultiplayerState Hook'u

**Cursor Senkronizasyonu:**
```typescript
import { useMultiplayerState } from 'multisynq-react';

const [myCursor, setMyCursor, otherCursors] = useMultiplayerState<CursorData>({
  key: 'cursor',
  defaultValue: {
    id: generateUserId(),
    x: 0,
    y: 0,
    color: generateUserColor(),
    username: 'Anonymous',
    timestamp: Date.now()
  },
  syncMode: 'realtime', // 'realtime' | 'onchange' | 'manual'
  debounceMs: 16, // 60 FPS için throttling
});

// Mouse hareketiyle cursor güncelleme
const handleMouseMove = (event: React.MouseEvent) => {
  const rect = event.currentTarget.getBoundingClientRect();
  setMyCursor(prev => ({
    ...prev,
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    timestamp: Date.now()
  }));
};
```

**Drawing Data Senkronizasyonu:**
```typescript
const [drawings, setDrawings, othersDrawings] = useMultiplayerState({
  key: 'drawings',
  defaultValue: [],
  merge: (local, remote) => {
    // Custom merge logic
    const allDrawings = [...local, ...remote];
    return allDrawings.sort((a, b) => a.timestamp - b.timestamp);
  }
});

// Yeni çizim ekleme
const addDrawing = (x: number, y: number) => {
  const newDrawing = {
    id: `drawing_${Date.now()}`,
    type: 'circle',
    x, y,
    color: myCursor.color,
    userId: myCursor.id,
    timestamp: Date.now()
  };
  
  setDrawings(prev => [...prev, newDrawing]);
};
```

#### 3. useCollaborators Hook'u

```typescript
import { useCollaborators } from 'multisynq-react';

const collaborators = useCollaborators();
// Returns: Array<{ id: string, presence: any, cursor?: CursorData }>

// Aktif kullanıcıları göster
{collaborators.map(user => (
  <div key={user.id}>
    {user.id} - {user.cursor ? 'Active' : 'Idle'}
  </div>
))}
```

#### 4. useMultiplayerEvents Hook'u

```typescript
import { useMultiplayerEvents } from 'multisynq-react';

const { sendEvent, events } = useMultiplayerEvents();

// Event listener
useEffect(() => {
  const unsubscribe = events.subscribe('user-action', (data) => {
    console.log('User action received:', data);
  });
  return unsubscribe;
}, [events]);

// Event gönderme
const handleClick = () => {
  sendEvent('user-action', {
    type: 'canvas-clicked',
    userId: myCursor.id,
    timestamp: Date.now()
  });
};
```

#### 5. useMultiplayerValue Hook'u

```typescript
// Tek değer senkronizasyonu için
const [selectedTool, setSelectedTool, othersSelectedTool] = useMultiplayerValue('selectedTool', 'pen');

// Tool değiştirme
const changeTool = (tool: string) => {
  setSelectedTool(tool);
};
```

### Hook API Avantajları

- ✅ **Otomatik Senkronizasyon**: State değişiklikleri otomatik olarak tüm kullanıcılara yayılır
- ✅ **TypeScript Desteği**: Tam tip güvenliği
- ✅ **Built-in Conflict Resolution**: Çakışmaları otomatik çözer
- ✅ **Custom Merge Logic**: Özel birleştirme mantığı tanımlama
- ✅ **Event System**: Özel event'ler için pub-sub sistemi
- ✅ **Debouncing/Throttling**: Performance optimizasyonu
- ✅ **Presence Awareness**: Kullanıcı durumu takibi

## 🎯 Geliştirme

### Yeni Özellikler Ekleme

1. **Çizim Fonksiyonları**
   ```typescript
   // types.ts'e yeni drawing types ekleyin
   export interface DrawingData {
     type: 'line' | 'circle' | 'rect';
     // ...
   }
   ```

2. **Canvas Etkileşimleri**
   ```typescript
   // MultiplayerCanvas.tsx'te yeni event handlers
   const handleCanvasClick = (event) => {
     // Çizim logic'i
   };
   ```

### API Referansları

- [Multisynq Docs](https://docs.multisynq.io/)
- [Viem Documentation](https://viem.sh/)
- [Monad Testnet](https://docs.monad.xyz/)

## 🐛 Sorun Giderme

### Yaygın Sorunlar

1. **Cüzdan Bağlantı Hatası**
   - MetaMask'ın güncel olduğundan emin olun
   - Monad testnet'in ekli olduğunu kontrol edin

2. **Multisynq Bağlantı Sorunu**
   - API key'in doğru olduğunu kontrol edin
   - Network connectivity'i test edin

3. **Canvas Render Problemleri**
   - Tarayıcı console'unu kontrol edin
   - Canvas boyutlarını kontrol edin

### Log Çıktıları

Geliştirme sırasında console'da göreceğiniz loglar:
```
✓ Mock Multisynq session started
✓ Cursor update: { x: 123, y: 456, userId: "user_...", color: "#ef4444" }
```

## 📄 Lisans

Bu proje açık kaynak kodludur ve MIT lisansı altında dağıtılmaktadır.

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📞 İletişim

Sorularınız için:
- GitHub Issues
- Multisynq Community
- Monad Discord

---

**🎨 Monad Canvas ile gerçek zamanlı çok oyunculu deneyimi keşfedin!** 