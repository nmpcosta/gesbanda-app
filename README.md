# GesBanda · App do músico

Aplicação React Native para Android e iOS. Após iniciar sessão, a agenda mostra os próximos ensaios e concertos da formação selecionada. O nome da banda no topo permite mudar de formação.

No evento, o músico pode indicar a disponibilidade, marcar presença numa chamada aberta e consultar a planta. O modo de palco abre as pautas privadas na ordem do repertório e mantém o ecrã ligado durante a leitura. Quando há várias partes, o músico pode escolher qual usar em palco. Os PDFs são preparados temporariamente enquanto o leitor está aberto.

## Desenvolvimento

A partir da raiz deste repositório, instala as dependências com `npm ci`. Para Android, inicia o Metro com `npm start` e executa `npm run android` noutro terminal. Para iOS, instala os pods com `bundle install` e `bundle exec pod install --project-directory=ios` num Mac e executa `npm run ios`.

## Ligação à API

Configura `apiBaseUrl` em `app.json` com o endereço HTTPS da API GesBanda, incluindo `/api/v1`, antes de preparar uma distribuição. Em desenvolvimento, o valor vazio usa `http://10.0.2.2:8000/api/v1` no emulador Android e `http://localhost:8000/api/v1` no simulador iOS. Um dispositivo físico precisa de um endereço que consiga alcançar.

## Validação

Executa `npm test -- --runInBand` e `npx tsc --noEmit`. Para gerar o APK Android de desenvolvimento em Windows, executa `gradlew.bat :app:assembleDebug` na pasta `android`.
