# Testa GameRuns skärmtid på iPhone

## Vad koden gör och inte gör

- Hälsa ger passets slutliga steg; varje komplett 200 steg sparar 1 minut.
- Barnet väljer 1–180 minuter från sitt sparade saldo. Tiden dras en gång och ett fast tidsfönster börjar direkt, även om barnet inte använder apparna.
- Valda appar, kategorier och webbplatser blockeras med Apples Managed Settings. De öppnas under tidsfönstret och blockeras igen av ett Device Activity Monitor-tillägg, även när GameRun är stängd.
- Det är **inte** ett lås av hela telefonen. Behåll GameRun, Telefon och nödvändiga appar tillgängliga; välj inte GameRun eller en kategori som omfattar GameRun.
- Ingen påhittad blockering visas på webben. Koden är tillagd, men Swift-kompilering, rättigheter och faktisk blockering är **inte verifierade på iPhone** här.
- De befintliga skärmarna är fortfarande Capacitor-skärmar; skärmtidsdelen är Swift. Detta gör inte hela gränssnittet till en ren SwiftUI-app.

## 1. Förbered Mac och telefon

Du behöver aktuell Xcode, Apple Developer-team med rätt signering, en fysisk iPhone med iOS 16 eller senare (eller högre version som Capacitor kräver) och aktiverat utvecklarläge på telefonen.

Använd först en separat testtelefon. För barnauktorisering ska telefonen vara inloggad med ett riktigt Apple-barnkonto i förälderns Familjedelning. Ett barnkonto i **GameRun** skapar inte ett Apple-barnkonto. Föräldern måste godkänna Apples dialog på barnets telefon.

Hämta den senaste projektkoden på din Mac och kör i projektmappen:

```sh
npm install
# Bara om ios-mappen saknas:
npx cap add ios
npm run ios
npx cap open ios
```

`npm run ios` bygger de lokala skärmarna, synkar båda Swift-pluginerna och lägger till hälsa-/rörelsetexterna. Det skapar inte ett signerat skärmtidstillägg automatiskt.

## 2. Appens rättigheter i Xcode

Välj **App**-target → **Signing & Capabilities**:

1. Välj ert Apple Developer-team och en unik Bundle Identifier (nu `com.axel.gamerun`).
2. Lägg till **HealthKit**, **Family Controls** och **App Groups**.
3. Registrera och markera **`group.com.axel.gamerun`** i App Groups. Om gruppnamnet redan ägs av någon annan, byt till ert eget i `ScreenTimeState.swift` och båda targets rättigheter.
4. Kontrollera `NSMotionUsageDescription` och `NSHealthShareUsageDescription` under Info. Behåll eventuella ytterligare HealthKit-nycklar som er HealthKit-plugin kräver.

En ren Capability-inställning räcker inte: signeringsprofilen måste innehålla samma rättigheter.

## 3. Lägg till tillägget som återblockerar

1. **File → New → Target → Device Activity Monitor Extension**. Namnge det **GameRunMonitor**. Använd samma team och minst iOS 16.
2. Lägg till **Family Controls** och **App Groups** på **GameRunMonitor**, och markera samma `group.com.axel.gamerun`.
3. Ta bort den genererade monitor-klassen från targeten så ni inte har två monitorer.
4. Lägg till dessa två befintliga filer via **Add Files to…**, utan att göra nya kopior:
   - `plugins/gamerun-screen-time/ios/Monitor/GameRunActivityMonitor.swift`
   - `plugins/gamerun-screen-time/ios/Sources/GameRunScreenTimePlugin/ScreenTimeState.swift`
   Markera **bara GameRunMonitor** som target membership för dessa referenser. Pluginpaketet kompilerar redan state-filen för appen.
5. I monitor-targetens Info: behåll Xcodes vanliga bundle-nycklar och kontrollera:
   - `NSExtension → NSExtensionPointIdentifier`: `com.apple.deviceactivity.monitor-extension`
   - `NSExtension → NSExtensionPrincipalClass`: `$(PRODUCT_MODULE_NAME).GameRunActivityMonitor`
   - Ny Boolean **`GameRunMonitor` = YES**.
   `ios/Monitor/Info.plist` i pluginmappen är en referens för dessa nycklar, inte en ersättning för alla Xcodes bundle-inställningar.
6. På **App**-targetens Info, lägg till Boolean **`GameRunMonitorConfigured` = YES** efter att tillägget har konfigurerats.
7. Kontrollera att **App → Build Phases → Embed App Extensions** innehåller `GameRunMonitor.appex`. Xcode skapar detta när ni lägger till targeten; lägg till det om det saknas.
8. Välj iPhone och kör **Product → Build**, därefter **Run**.

Pluginen vägrar aktivering om App Group eller det inbäddade monitor-tillägget saknas. Markera inte konfigurationen som klar utan rätt signering.

## 4. Genomför första testet

1. Logga in som barn i GameRun. Startsidan visar **Min skärmtid**.
2. Tryck **Godkänn med förälder**, slutför Apples familjegodkännande.
3. Tryck **Välj appar med förälder** och välj **en oviktig testapp**, inte GameRun. Spara.
4. Öppna testappen. Den ska nu visa Apples blockeringsskärm.
5. Tillåt rörelse och Hälsa. Starta ett pass, gå minst 200 steg och avsluta passet. Vänta vid behov tills Hälsa hunnit uppdateras innan du avslutar.
6. Kontrollera att sparat saldo ökar med `heltal(steg / 200)` minuter. Steg som redan fanns före passet ska inte belönas igen.
7. Välj **1 minut**, tryck **Aktivera tid** och kontrollera att testappen går att öppna. Saldo ska minska med exakt en minut.
8. Stäng GameRun helt medan testappen är öppen. När minutens tidsfönster gått ut ska testappen återblockeras **utan att GameRun öppnas**.
9. Öppna GameRun igen: tidsfönstret är avslutat och saldot förblir korrekt.

**Viktigt om korta tider:** Apple kräver ett monitorintervall på minst 15 minuter. Koden börjar själva monitorintervallet 16 minuter bakåt men behåller tidsfönstrets riktiga sluttid. Det är en implementeringslösning som måste verifieras på era iOS-versioner, särskilt nära midnatt; om iOS avvisar schemat lyfts inte blockeringen. Godkänd schemaläggning är inte en garanti för sekundexakt återblockering. Om 1-minutstestet inte fungerar, gå inte vidare till användare; samla Xcode-loggar och jämför ett 15-minuterstest.

## 5. Kontroller innan ni släpper appen

- Noll saldo: det ska inte gå att aktivera tid.
- Fler minuter än saldo: nekas, inget negativt saldo.
- Dubbeltryck och avbruten anslutning: samma aktiverings-ID ska inte debitera två gånger.
- Om tiden debiterades men native-aktiveringen misslyckades: **Försök igen** använder samma ID/sluttid. Ingen automatisk återbetalning görs, eftersom det inte går att bevisa att upplåsning aldrig skedde. Tidsfönstret löper från reservationen; tid kan gå förlorad vid tekniska fel.
- En aktiv session tillhör en iPhone. Ett andra tidsfönster får inte överlappa på samma barnkonto.
- Testa 1, 5 och 15 minuter; över midnatt; omstart av telefonen; bakgrund; stängd app; ändrad klocka/tidszon; återkallad rättighet. Exakt callback-tid styrs av iOS. Behandla manipulerad enhetsklocka och förfalskade steg som separata säkerhetstester, inte som något som denna kod har löst.
- Testa att barnet inte kan ändra appval utan Apples föräldragodkännande, ta bort GameRun eller kringgå blockeringen. En länkad GameRun-förälder ger inte i sig fjärrstyrning av Apples appväljare.
- Testa förälderns minutgåvor och godkända förfrågningar samtidigt med pass/aktivering. Alla saldomutationer ska vara transaktioner.
- Kontrollera att Telefon/nödvändiga tjänster och GameRun förblir tillgängliga.

## 6. TestFlight / App Store

Utveckling på egen telefon och distribution är olika steg. Begär Apples **Family Controls distribution entitlement** för appen och tillägget via Apple Developer. Konfigurera provisioning för respektive Bundle ID och App Group. Apple måste godkänna tillståndet innan TestFlight/App Store kan fungera; Lovable kan inte bevilja det.

Apples dokumentation: [Family Controls](https://developer.apple.com/documentation/familycontrols), [Configuring Family Controls](https://developer.apple.com/documentation/xcode/configuring-family-controls), [Device Activity](https://developer.apple.com/documentation/deviceactivity).