-- ============================================
-- Populate i18n translations for all courses
-- ============================================
-- Run AFTER 20260306_add_course_i18n_columns.sql
-- Matches on English title (case-insensitive ILIKE)
-- ============================================

-- =============================================
-- PREMIUM PATHWAY
-- =============================================
UPDATE courses SET
  title_it       = 'DSA SMART START - PERCORSO PREMIUM',
  title_sr       = 'DSA SMART START - PREMIUM PROGRAM',
  title_es       = 'DSA SMART START - PROGRAMA PREMIUM',
  description_it = 'Il Percorso PREMIUM DSA Smart Start Opzione B è un programma completo e innovativo pensato per studenti con DSA che vogliono imparare l''inglese in modo chiaro, stimolante e senza frustrazioni. Attraverso un metodo multisensoriale e materiali ad alta leggibilità, il percorso combina lezioni individuali, laboratori di gruppo, mappe mentali e video lezioni per rendere l''apprendimento più semplice ed efficace. Il Metodo DSA Smart Start è l''unico che integra socializzazione, strumenti compensativi specifici e un approccio graduale, per guidare gli studenti passo dopo passo, con fiducia e motivazione.',
  description_sr = 'PREMIUM DSA Smart Start program opcija B je kompletan i inovativan program osmišljen za učenike sa specifičnim teškoćama u učenju koji žele da nauče engleski na jasan, stimulativan način bez frustracija. Kroz multisenzorni metod i materijale visoke čitljivosti, program kombinuje individualne časove, grupne radionice, mentalne mape i video lekcije kako bi učenje bilo lakše i efikasnije. DSA Smart Start metod je jedini koji integriše socijalizaciju, specifične kompenzatorne alate i postepen pristup, vodeći učenike korak po korak, sa poverenjem i motivacijom.',
  description_es = 'El Programa PREMIUM DSA Smart Start Opción B es un programa completo e innovador diseñado para estudiantes con DEA que desean aprender inglés de manera clara, estimulante y sin frustraciones. A través de un método multisensorial y materiales de alta legibilidad, el programa combina lecciones individuales, talleres grupales, mapas mentales y videolecciones para hacer el aprendizaje más fácil y efectivo. El Método DSA Smart Start es el único que integra socialización, herramientas compensatorias específicas y un enfoque gradual, para guiar a los estudiantes paso a paso, con confianza y motivación.'
WHERE title ILIKE '%PREMIUM PATHWAY%';

-- =============================================
-- GOLD PATHWAY
-- =============================================
UPDATE courses SET
  title_it       = 'DSA SMART START - PERCORSO GOLD',
  title_sr       = 'DSA SMART START - GOLD PROGRAM',
  title_es       = 'DSA SMART START - PROGRAMA GOLD',
  description_it = 'Il Percorso GOLD DSA Smart Start è un programma strutturato e innovativo pensato per studenti con DSA che vogliono imparare l''inglese in modo chiaro, coinvolgente e senza frustrazioni. Grazie a un metodo multisensoriale e ad alta leggibilità, il percorso combina lezioni interattive di gruppo, mappe mentali, video lezioni e materiali dedicati per rendere l''apprendimento più semplice ed efficace. Il metodo DSA Smart Start è l''unico che combina socializzazione, strumenti compensativi specifici e un approccio graduale, per guidare gli studenti nel loro percorso di apprendimento con fiducia e motivazione.',
  description_sr = 'GOLD DSA Smart Start program je strukturiran i inovativan program osmišljen za učenike sa specifičnim teškoćama u učenju koji žele da nauče engleski na jasan, privlačan način bez frustracija. Zahvaljujući multisenzornom metodu i materijalima visoke čitljivosti, program kombinuje interaktivne grupne časove, mentalne mape, video lekcije i posvećene materijale kako bi učenje bilo lakše i efikasnije. DSA Smart Start metod je jedini koji kombinuje socijalizaciju, specifične kompenzatorne alate i postepen pristup, da vodi učenike na njihovom putu učenja sa poverenjem i motivacijom.',
  description_es = 'El Programa GOLD DSA Smart Start es un programa estructurado e innovador diseñado para estudiantes con DEA que desean aprender inglés de manera clara, atractiva y sin frustraciones. Gracias a un método multisensorial y de alta legibilidad, el programa combina lecciones interactivas grupales, mapas mentales, videolecciones y materiales dedicados para hacer el aprendizaje más fácil y efectivo. El método DSA Smart Start es el único que combina socialización, herramientas compensatorias específicas y un enfoque gradual, para guiar a los estudiantes en su camino de aprendizaje con confianza y motivación.'
WHERE title ILIKE '%GOLD PATHWAY%';

-- =============================================
-- A1 LEVEL (service / live course from seed-courses)
-- =============================================
UPDATE courses SET
  title_it       = 'DSA SMART START - LIVELLO A1',
  title_sr       = 'DSA SMART START - NIVO A1',
  title_es       = 'DSA SMART START - NIVEL A1',
  description_it = 'Il volume DSA Smart Start Livello A1 è pensato per guidare gli studenti con Disturbi Specifici dell''Apprendimento (DSA) nei primi passi dell''apprendimento dell''inglese. Grazie a un approccio visivo, multisensoriale e inclusivo, ogni unità didattica è progettata per facilitare la comprensione, la memorizzazione e l''uso attivo della lingua, rendendo l''esperienza di apprendimento accessibile e motivante. Questo programma rappresenta il primo livello del programma DSA Smart Start, un metodo che integra tecniche di apprendimento efficaci, supporti visivi e strategie personalizzate. Adatto a studenti dagli 8 anni in su, genitori, insegnanti di sostegno e tutor dell''apprendimento.',
  description_sr = 'DSA Smart Start nivo A1 je osmišljen da vodi učenike sa specifičnim teškoćama u učenju u prvim koracima učenja engleskog jezika. Zahvaljujući vizuelnom, multisenzornom i inkluzivnom pristupu, svaka nastavna jedinica je dizajnirana da olakša razumevanje, pamćenje i aktivnu upotrebu jezika, čineći iskustvo učenja pristupačnim i motivišućim. Ovaj program predstavlja prvi nivo DSA Smart Start programa, metoda koja integriše efikasne tehnike učenja, vizuelne podrške i personalizovane strategije. Pogodan za učenike od 8 godina, roditelje, nastavnike podrške i tutore.',
  description_es = 'El volumen DSA Smart Start Nivel A1 está diseñado para guiar a los estudiantes con Dificultades Específicas de Aprendizaje (DEA) en sus primeros pasos en el aprendizaje del inglés. Gracias a un enfoque visual, multisensorial e inclusivo, cada unidad didáctica está diseñada para facilitar la comprensión, la memorización y el uso activo del idioma, haciendo que la experiencia de aprendizaje sea accesible y motivadora. Este programa representa el primer nivel del programa DSA Smart Start, un método que integra técnicas de aprendizaje efectivas, apoyos visuales y estrategias personalizadas. Adecuado para estudiantes a partir de 8 años, padres, profesores de apoyo y tutores de aprendizaje.'
WHERE title ILIKE 'DSA SMART START - A1 LEVEL%';

-- =============================================
-- A2 LEVEL (service / live course)
-- =============================================
UPDATE courses SET
  title_it       = 'DSA SMART START - LIVELLO A2',
  title_sr       = 'DSA SMART START - NIVO A2',
  title_es       = 'DSA SMART START - NIVEL A2',
  description_it = 'Il volume DSA Smart Start Livello A2 è pensato per guidare gli studenti con DSA nel consolidamento delle competenze linguistiche acquisite e nell''introduzione di strutture grammaticali più complesse. Grazie a un approccio visivo, multisensoriale e inclusivo, ogni unità didattica è strutturata per facilitare la comprensione, la memorizzazione e l''uso attivo della lingua. Questo livello segue la preparazione Cambridge English A2 Key (KET). Adatto a studenti dai 9 anni in su.',
  description_sr = 'DSA Smart Start nivo A2 je osmišljen da vodi učenike sa specifičnim teškoćama u učenju u učvršćivanju stečenih jezičkih veština i uvođenju složenijih gramatičkih struktura. Zahvaljujući vizuelnom, multisenzornom i inkluzivnom pristupu, svaka nastavna jedinica je strukturirana da olakša razumevanje, pamćenje i aktivnu upotrebu jezika. Ovaj nivo prati pripremu za Cambridge English A2 Key (KET). Pogodan za učenike od 9 godina.',
  description_es = 'El volumen DSA Smart Start Nivel A2 está diseñado para guiar a los estudiantes con DEA en la consolidación de las competencias lingüísticas adquiridas y la introducción de estructuras gramaticales más complejas. Gracias a un enfoque visual, multisensorial e inclusivo, cada unidad didáctica está estructurada para facilitar la comprensión, la memorización y el uso activo del idioma. Este nivel sigue la preparación Cambridge English A2 Key (KET). Adecuado para estudiantes a partir de 9 años.'
WHERE title ILIKE 'DSA SMART START - A2 LEVEL%';

-- =============================================
-- B1 LEVEL (service / live course)
-- =============================================
UPDATE courses SET
  title_it       = 'DSA SMART START - LIVELLO B1',
  title_sr       = 'DSA SMART START - NIVO B1',
  title_es       = 'DSA SMART START - NIVEL B1',
  description_it = 'Il volume DSA Smart Start Livello B1 è pensato per guidare gli studenti con DSA in una fase intermedia dell''apprendimento dell''inglese. Questo livello introduce strutture grammaticali più avanzate e promuove lo sviluppo delle 4 competenze: ascolto, lettura, scrittura e conversazione. Questo livello segue la preparazione Cambridge English B1 Preliminary (PET). Adatto a studenti dai 10 anni in su.',
  description_sr = 'DSA Smart Start nivo B1 je osmišljen da vodi učenike sa specifičnim teškoćama u učenju u srednjoj fazi učenja engleskog jezika. Ovaj nivo uvodi naprednije gramatičke strukture i promoviše razvoj 4 veštine: slušanje, čitanje, pisanje i govor. Ovaj nivo prati pripremu za Cambridge English B1 Preliminary (PET). Pogodan za učenike od 10 godina.',
  description_es = 'El volumen DSA Smart Start Nivel B1 está diseñado para guiar a los estudiantes con DEA en una fase intermedia del aprendizaje del inglés. Este nivel introduce estructuras gramaticales más avanzadas y promueve el desarrollo de las 4 competencias: comprensión auditiva, lectura, escritura y expresión oral. Este nivel sigue la preparación Cambridge English B1 Preliminary (PET). Adecuado para estudiantes a partir de 10 años.'
WHERE title ILIKE 'DSA SMART START - B1 LEVEL%';

-- =============================================
-- KIDS - BASIC LEVEL (service)
-- =============================================
UPDATE courses SET
  title_it       = 'DSA SMART START KIDS - LIVELLO BASE',
  title_sr       = 'DSA SMART START KIDS - OSNOVNI NIVO',
  title_es       = 'DSA SMART START KIDS - NIVEL BÁSICO',
  description_it = 'Introduzione all''inglese attraverso canzoni, immagini e esplorazione sensoriale. Perfetto per i piccoli studenti con dislessia. Un modo divertente e coinvolgente per iniziare a imparare l''inglese.',
  description_sr = 'Uvod u engleski kroz pesme, slike i senzorno istraživanje. Savršeno za male učenike sa disleksijom. Zabavan i privlačan način za početak učenja engleskog.',
  description_es = 'Introducción al inglés a través de canciones, imágenes y exploración sensorial. Perfecto para los pequeños estudiantes con dislexia. Una forma divertida y atractiva de empezar a aprender inglés.'
WHERE title ILIKE 'DSA SMART START KIDS - BASIC LEVEL%';

-- =============================================
-- KIDS - MEDIUM LEVEL (service)
-- =============================================
UPDATE courses SET
  title_it       = 'DSA SMART START KIDS - LIVELLO INTERMEDIO',
  title_sr       = 'DSA SMART START KIDS - SREDNJI NIVO',
  title_es       = 'DSA SMART START KIDS - NIVEL INTERMEDIO',
  description_it = 'Narrazione interattiva e giochi di vocabolario per un apprendimento attivo. Costruisci sulle competenze di base con attività coinvolgenti pensate per giovani studenti con differenze di apprendimento.',
  description_sr = 'Interaktivno pripovedanje i igre vokabulara za aktivno učenje. Nadogradite osnovne veštine privlačnim aktivnostima osmišljenim za mlade učenike sa razlikama u učenju.',
  description_es = 'Narración interactiva y juegos de vocabulario para un aprendizaje activo. Amplía las habilidades básicas con actividades atractivas diseñadas para jóvenes estudiantes con diferencias de aprendizaje.'
WHERE title ILIKE 'DSA SMART START KIDS - MEDIUM LEVEL%';

-- =============================================
-- KIDS - ADVANCED LEVEL (service)
-- =============================================
UPDATE courses SET
  title_it       = 'DSA SMART START KIDS - LIVELLO AVANZATO',
  title_sr       = 'DSA SMART START KIDS - NAPREDNI NIVO',
  title_es       = 'DSA SMART START KIDS - NIVEL AVANZADO',
  description_it = 'Preparazione al successo scolastico con mnemonici visivi avanzati. Perfetto per pre-adolescenti pronti a portare le loro competenze in inglese al livello successivo con metodi adatti alla dislessia.',
  description_sr = 'Priprema za školski uspeh sa naprednim vizuelnim mnemotehnikama. Savršeno za predadolescente spremne da svoje veštine engleskog podignu na viši nivo metodama prilagođenim disleksiji.',
  description_es = 'Preparación para el éxito escolar con mnemotécnicas visuales avanzadas. Perfecto para preadolescentes listos para llevar sus habilidades en inglés al siguiente nivel con métodos adaptados a la dislexia.'
WHERE title ILIKE 'DSA SMART START KIDS - ADVANCED LEVEL%';

-- =============================================
-- A1 EBOOK
-- =============================================
UPDATE courses SET
  title_it       = 'E-book A1 Principiante',
  title_sr       = 'A1 Početni E-knjiga',
  title_es       = 'E-book A1 Principiante',
  description_it = 'E-book digitale completo per principianti assoluti. Impara le basi dell''inglese con la nostra guida PDF completa che copre vocabolario, grammatica e frasi essenziali.',
  description_sr = 'Kompletna digitalna e-knjiga za apsolutne početnike. Naučite osnove engleskog sa našim sveobuhvatnim PDF vodičem koji pokriva vokabular, gramatiku i bitne fraze.',
  description_es = 'E-book digital completo para principiantes absolutos. Aprende los fundamentos del inglés con nuestra guía PDF integral que cubre vocabulario, gramática y frases esenciales.'
WHERE title ILIKE 'A1 Beginner E-book%' AND product_type = 'ebook';

-- =============================================
-- A2 EBOOK
-- =============================================
UPDATE courses SET
  title_it       = 'E-book A2 Elementare',
  title_sr       = 'A2 Elementarni E-knjiga',
  title_es       = 'E-book A2 Elemental',
  description_it = 'Costruisci sulle tue basi con il nostro e-book A2. Amplia il vocabolario, migliora la grammatica e acquisisci sicurezza nelle conversazioni quotidiane.',
  description_sr = 'Nadogradite osnove sa našom A2 e-knjigom. Proširite vokabular, poboljšajte gramatiku i stekneite sigurnost u svakodnevnim razgovorima.',
  description_es = 'Amplía tus bases con nuestro e-book A2. Expande tu vocabulario, mejora la gramática y gana confianza en las conversaciones cotidianas.'
WHERE title ILIKE 'A2 Elementary E-book%' AND product_type = 'ebook';

-- =============================================
-- B1 EBOOK
-- =============================================
UPDATE courses SET
  title_it       = 'E-book B1 Intermedio',
  title_sr       = 'B1 Srednji E-knjiga',
  title_es       = 'E-book B1 Intermedio',
  description_it = 'Porta il tuo inglese al livello successivo. Il nostro e-book B1 copre strutture grammaticali complesse, vocabolario avanzato e competenze di comunicazione professionale.',
  description_sr = 'Podignite svoj engleski na viši nivo. Naša B1 e-knjiga pokriva složene gramatičke strukture, napredni vokabular i veštine profesionalne komunikacije.',
  description_es = 'Lleva tu inglés al siguiente nivel. Nuestro e-book B1 cubre estructuras gramaticales complejas, vocabulario avanzado y habilidades de comunicación profesional.'
WHERE title ILIKE 'B1 Intermediate E-book%' AND product_type = 'ebook';

-- =============================================
-- B2 EBOOK (draft)
-- =============================================
UPDATE courses SET
  title_it       = 'E-book B2 Intermedio Superiore',
  title_sr       = 'B2 Viši Srednji E-knjiga',
  title_es       = 'E-book B2 Intermedio Superior',
  description_it = 'Padroneggia l''inglese avanzato con il nostro e-book B2 completo. Perfetto per chi punta alla fluenza in contesti professionali e accademici.',
  description_sr = 'Savladajte napredni engleski sa našom sveobuhvatnom B2 e-knjigom. Savršeno za one koji teže tečnosti u profesionalnim i akademskim kontekstima.',
  description_es = 'Domina el inglés avanzado con nuestro e-book B2 integral. Perfecto para quienes buscan fluidez en contextos profesionales y académicos.'
WHERE title ILIKE 'B2 Upper-Intermediate E-book%' AND product_type = 'ebook';

-- =============================================
-- KIDS BASIC EBOOK
-- =============================================
UPDATE courses SET
  title_it       = 'E-book Kids Base',
  title_sr       = 'Kids Osnovna E-knjiga',
  title_es       = 'E-book Kids Básico',
  description_it = 'Un e-book divertente e colorato pensato per i piccoli studenti! Introduce l''inglese di base attraverso storie coinvolgenti, immagini e semplici esercizi.',
  description_sr = 'Zabavna i šarena e-knjiga dizajnirana za male učenike! Uvodi osnove engleskog kroz privlačne priče, slike i jednostavne vežbe.',
  description_es = 'Un e-book divertido y colorido diseñado para los pequeños estudiantes. Introduce el inglés básico a través de historias atractivas, imágenes y ejercicios sencillos.'
WHERE title ILIKE 'Kids Basic E-book%' AND product_type = 'ebook';

-- =============================================
-- KIDS MOVERS EBOOK
-- =============================================
UPDATE courses SET
  title_it       = 'DSA SMART START KIDS – MOVERS E-BOOK',
  title_sr       = 'DSA SMART START KIDS – MOVERS E-KNJIGA',
  title_es       = 'DSA SMART START KIDS – MOVERS E-BOOK',
  description_it = 'L''e-book DSA Smart Start Kids Medium si basa sulle competenze di base, progettato per giovani studenti dai 7 ai 10 anni pronti ad ampliare le proprie competenze in inglese. Attraverso l''apprendimento basato sulle storie, attività creative ed esercizi interattivi, i bambini sviluppano sicurezza nella lettura, scrittura e conversazione. Ogni pagina incorpora metodi adatti alla dislessia per supportare tutti gli stili di apprendimento.',
  description_sr = 'DSA Smart Start Kids Medium e-knjiga nadograđuje osnove, dizajnirana za mlade učenike uzrasta 7-10 godina koji su spremni da prošire svoje veštine engleskog. Kroz učenje zasnovano na pričama, kreativne aktivnosti i interaktivne vežbe, deca razvijaju samopouzdanje u čitanju, pisanju i govoru. Svaka stranica uključuje metode prilagođene disleksiji za podršku svim stilovima učenja.',
  description_es = 'El e-book DSA Smart Start Kids Medium se basa en lo básico, diseñado para jóvenes estudiantes de 7 a 10 años listos para ampliar sus habilidades en inglés. A través del aprendizaje basado en historias, actividades creativas y ejercicios interactivos, los niños desarrollan confianza en la lectura, escritura y expresión oral. Cada página incorpora métodos adaptados a la dislexia para apoyar todos los estilos de aprendizaje.'
WHERE title ILIKE '%MOVERS EBOOK%' AND product_type = 'ebook';

-- =============================================
-- KIDS ADVANCED EBOOK
-- =============================================
UPDATE courses SET
  title_it       = 'E-book Kids Avanzato',
  title_sr       = 'Kids Napredna E-knjiga',
  title_es       = 'E-book Kids Avanzado',
  description_it = 'Per giovani studenti sicuri e pronti a eccellere! Grammatica avanzata, vocabolario ampliato e esercizi di scrittura creativa in un formato adatto ai bambini.',
  description_sr = 'Za samouverene mlade učenike spremne da se istaknu! Napredna gramatika, prošireni vokabular i vežbe kreativnog pisanja u formatu prilagođenom deci.',
  description_es = 'Para jóvenes estudiantes seguros y listos para sobresalir. Gramática avanzada, vocabulario ampliado y ejercicios de escritura creativa en un formato adaptado a los niños.'
WHERE title ILIKE 'Kids Advanced E-book%' AND product_type = 'ebook';

-- =============================================
-- A1 INTERACTIVE COURSE
-- =============================================
UPDATE courses SET
  title_it       = 'A1 Principiante - Corso Interattivo',
  title_sr       = 'A1 Početni - Interaktivni Kurs',
  title_es       = 'A1 Principiante - Curso Interactivo',
  description_it = 'Inizia il tuo percorso in inglese con il nostro corso interattivo A1. Video lezioni, quiz e esercizi pensati per principianti assoluti.',
  description_sr = 'Započnite svoj put u engleskom sa našim interaktivnim A1 kursom. Video lekcije, kvizovi i vežbe dizajnirani za apsolutne početnike.',
  description_es = 'Comienza tu camino en inglés con nuestro curso interactivo A1. Videolecciones, cuestionarios y ejercicios diseñados para principiantes absolutos.'
WHERE title ILIKE 'A1 Beginner - Interactive Course%' AND product_type = 'learndash';

-- =============================================
-- A2 INTERACTIVE COURSE
-- =============================================
UPDATE courses SET
  title_it       = 'A2 Elementare - Corso Interattivo',
  title_sr       = 'A2 Elementarni - Interaktivni Kurs',
  title_es       = 'A2 Elemental - Curso Interactivo',
  description_it = 'Costruisci sulle tue basi con il nostro corso interattivo A2. Contenuti video coinvolgenti, esercizi pratici e scenari di conversazione reale.',
  description_sr = 'Nadogradite osnove sa našim interaktivnim A2 kursom. Privlačan video sadržaj, praktične vežbe i scenariji stvarnih razgovora.',
  description_es = 'Amplía tus bases con nuestro curso interactivo A2. Contenido de video atractivo, ejercicios prácticos y escenarios de conversación real.'
WHERE title ILIKE 'A2 Elementary - Interactive Course%' AND product_type = 'learndash';

-- =============================================
-- B1 INTERACTIVE COURSE
-- =============================================
UPDATE courses SET
  title_it       = 'B1 Intermedio - Corso Interattivo',
  title_sr       = 'B1 Srednji - Interaktivni Kurs',
  title_es       = 'B1 Intermedio - Curso Interactivo',
  description_it = 'Avanza le tue competenze con il nostro corso B1 completo. Grammatica complessa, vocabolario professionale e pratica interattiva di conversazione.',
  description_sr = 'Unapredite svoje veštine sa našim sveobuhvatnim B1 kursom. Složena gramatika, profesionalni vokabular i interaktivna praksa govora.',
  description_es = 'Avanza tus habilidades con nuestro curso B1 integral. Gramática compleja, vocabulario profesional y práctica interactiva de conversación.'
WHERE title ILIKE 'B1 Intermediate - Interactive Course%' AND product_type = 'learndash';

-- =============================================
-- B2 INTERACTIVE COURSE (draft)
-- =============================================
UPDATE courses SET
  title_it       = 'B2 Intermedio Superiore - Corso Interattivo',
  title_sr       = 'B2 Viši Srednji - Interaktivni Kurs',
  title_es       = 'B2 Intermedio Superior - Curso Interactivo',
  description_it = 'Raggiungi la quasi-fluenza con il nostro corso avanzato B2. Inglese accademico, grammatica sfumata e strategie di comunicazione sofisticate.',
  description_sr = 'Postignite skoro tečnost sa našim naprednim B2 kursom. Akademski engleski, nijansirana gramatika i sofisticirane strategije komunikacije.',
  description_es = 'Alcanza la casi-fluidez con nuestro curso avanzado B2. Inglés académico, gramática matizada y estrategias de comunicación sofisticadas.'
WHERE title ILIKE 'B2 Upper-Intermediate - Interactive Course%' AND product_type = 'learndash';

-- =============================================
-- KIDS BASIC INTERACTIVE
-- =============================================
UPDATE courses SET
  title_it       = 'Kids Base - Corso Interattivo',
  title_sr       = 'Kids Osnovni - Interaktivni Kurs',
  title_es       = 'Kids Básico - Curso Interactivo',
  description_it = 'Lezioni animate divertenti per i piccoli principianti! Giochi, canzoni e attività interattive rendono l''apprendimento dell''inglese un''avventura.',
  description_sr = 'Zabavne animirane lekcije za male početnike! Igre, pesme i interaktivne aktivnosti čine učenje engleskog avanturom.',
  description_es = 'Lecciones animadas y divertidas para los pequeños principiantes. Juegos, canciones y actividades interactivas hacen del aprendizaje del inglés una aventura.'
WHERE title ILIKE 'Kids Basic - Interactive Course%' AND product_type = 'learndash';

-- =============================================
-- KIDS MEDIUM INTERACTIVE
-- =============================================
UPDATE courses SET
  title_it       = 'Kids Intermedio - Corso Interattivo',
  title_sr       = 'Kids Srednji - Interaktivni Kurs',
  title_es       = 'Kids Intermedio - Curso Interactivo',
  description_it = 'Continua il divertimento con contenuti più impegnativi! Apprendimento basato sulle storie, esercizi creativi e quiz interattivi per studenti in crescita.',
  description_sr = 'Nastavite zabavu sa zahtevnijim sadržajem! Učenje zasnovano na pričama, kreativne vežbe i interaktivni kvizovi za učenike u razvoju.',
  description_es = 'Continúa la diversión con contenido más desafiante. Aprendizaje basado en historias, ejercicios creativos y cuestionarios interactivos para estudiantes en crecimiento.'
WHERE title ILIKE 'Kids Medium - Interactive Course%' AND product_type = 'learndash';

-- =============================================
-- KIDS ADVANCED INTERACTIVE
-- =============================================
UPDATE courses SET
  title_it       = 'Kids Avanzato - Corso Interattivo',
  title_sr       = 'Kids Napredni - Interaktivni Kurs',
  title_es       = 'Kids Avanzado - Curso Interactivo',
  description_it = 'Sfida le giovani menti con contenuti avanzati! Grammatica complessa, progetti di scrittura creativa e preparazione per l''inglese scolastico.',
  description_sr = 'Izazovite mlade umove naprednim sadržajem! Složena gramatika, projekti kreativnog pisanja i priprema za školski engleski.',
  description_es = 'Desafía las mentes jóvenes con contenido avanzado. Gramática compleja, proyectos de escritura creativa y preparación para el inglés escolar.'
WHERE title ILIKE 'Kids Advanced - Interactive Course%' AND product_type = 'learndash';

-- =============================================
-- VERIFICATION
-- =============================================
SELECT title, 
       CASE WHEN title_it IS NOT NULL THEN '✅' ELSE '❌' END as has_it,
       CASE WHEN title_sr IS NOT NULL THEN '✅' ELSE '❌' END as has_sr,
       CASE WHEN title_es IS NOT NULL THEN '✅' ELSE '❌' END as has_es
FROM courses
ORDER BY product_type, level;
