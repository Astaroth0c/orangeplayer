# 🍊 ORANGE Player — Builds compiladas

## Android APK (compilado e assinado ✅)

O APK Android foi compilado com Capacitor 6 + Android SDK 34 e assinado com keystore próprio.

### Download direto
Após o push, o APK estará disponível em **GitHub Releases**: 
[https://github.com/Astaroth0c/orangeplayer/releases](https://github.com/Astaroth0c/orangeplayer/releases)

Arquivos:
- `ORANGE-Player-1.0.0-release.apk` — APK release assinado (~3 MB) — **recomendado**
- `ORANGE-Player-1.0.0-debug.apk` — APK debug (~3.6 MB) — para desenvolvimento

### Como instalar
1. Baixe o `ORANGE-Player-1.0.0-release.apk`
2. No Android, ative "Fontes desconhecidas" em Configurações > Segurança
3. Toque no APK e instale
4. Abra o app "ORANGE Player"

### Suporte
- Android 5.1+ (API 22+)
- Funciona em celular, tablet e **Android TV** (Leanback launcher)
- D-pad/controle remoto funcionando nativamente

### Configurar URL do servidor
O APK carrega a interface web de uma URL configurada. Para alterar:
1. Edite `platforms/android/capacitor.config.ts` — campo `server.url`
2. Rebuild: `cd platforms/android && npx cap sync android && cd android && ./gradlew assembleRelease`

Padrão: `http://10.0.2.2:3000` (loopback do emulador). Para uso real, use seu IP/servidor: `http://192.168.0.10:3000` ou `https://app.orangeplayer.example.com`

---

## Windows .exe/.msi (via GitHub Actions)

O Windows não compila no Linux diretamente (precisa de MSVC + WebView2). Use o GitHub Actions:

1. Vá em **Actions** no repositório
2. Selecione workflow **"Build All Platforms"**
3. Clique em **"Run workflow"**
4. Aguarde concluir (~10 min)
5. Baixe os artefatos em **Releases**

Ou crie uma tag `v1.0.0` para disparar automaticamente:
```bash
git tag v1.0.0
git push origin v1.0.0
```

Saídas: `.msi` (Microsoft Installer) e `.exe` (NSIS installer).

---

## Linux AppImage / .deb (via GitHub Actions)

Mesma pipeline. O runner Linux do GitHub Actions tem todas as dependências pré-instaladas (webkit2gtk-4.1, gtk-3, etc).

Saídas: `.AppImage` (executável universal) e `.deb` (Debian/Ubuntu).

### Como usar
- **AppImage**: `chmod +x ORANGE-Player*.AppImage && ./ORANGE-Player*.AppImage`
- **DEB**: `sudo dpkg -i orange-player_*.deb`

---

## macOS .dmg (via GitHub Actions)

Também compilado no macOS runner. Disponível para Intel e Apple Silicon (ARM).

---

## Samsung Tizen / LG webOS

Estas plataformas precisam de SDKs específicos (Tizen Studio, LG webOS SDK) que não podem ser instalados automaticamente no CI. Siga as instruções em:
- `platforms/tizen/README.md`
- `platforms/webos/README.md`

---

## PWA (Progressive Web App)

Já configurado no próprio app web. Acesse a URL hospedada no celular/desktop e use "Adicionar à tela inicial" — o app funciona offline (cache do Service Worker) e aparece como app nativo.

