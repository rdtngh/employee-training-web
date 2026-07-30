<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <style>
        @page {
            margin: 0;
            size: A4 landscape;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            color: #000000;
            font-family: DejaVu Sans, Arial, sans-serif;
        }

        .certificate {
            position: relative;
            width: 841px;
            height: 595px;
            overflow: hidden;
            background: #ffffff;
        }

        .asset {
            position: absolute;
            display: block;
        }

        .bg-daun {
            z-index: 2;
            top: 49px;
            left: 160px;
            width: 521px;
            height: 421px;
            opacity: .5;
        }

        .frame-gold {
            z-index: 1;
            top: 0;
            left: 0;
            width: 841px;
            height: 595px;
        }

        .sudut-atas {
            z-index: 3;
            top: -6px;
            left: -2px;
            width: 206px;
            height: 335px;
        }

        .sudut-bawah {
            z-index: 3;
            right: -2px;
            bottom: -6px;
            width: 206px;
            height: 335px;
        }

        .daun-kanan-atas {
            z-index: 3;
            top: -2px;
            left: 656px;
            width: 198px;
            height: 196px;
        }

        .piagam {
            z-index: 3;
            left: 50px;
            bottom: 45px;
            width: 195px;
            height: 230px;
        }

        .content {
            position: absolute;
            inset: 0;
            z-index: 4;
        }

        .title-block {
            position: absolute;
            top: 54px;
            left: 0;
            width: 100%;
            text-align: center;
        }

        .title {
            margin: 0;
            font-family: Georgia, "Times New Roman", serif;
            font-size: 64px;
            font-weight: 700;
            line-height: 1;
            letter-spacing: 0;
        }

        .subtitle {
            margin: 4px 0 0;
            font-family: Georgia, "Times New Roman", serif;
            font-size: 29px;
            font-weight: 500;
            line-height: 1;
            letter-spacing: .15em;
        }

        .garis-gold {
            position: absolute;
            top: 111px;
            left: 132px;
            width: 577px;
            height: 51px;
        }

        .recipient {
            position: absolute;
            z-index: 5;
            top: 220px;
            left: 140px;
            width: 561px;
            text-align: center;
        }

        .given-text {
            margin: 0 0 13px;
            font-size: 15px;
            font-weight: 400;
            line-height: 1.4;
        }

        .participant {
            max-width: 620px;
            margin: -10px auto -8px;
            padding: 10px 18px 8px;
            color: #b99645;
            font-family: "Brush Script MT", "Segoe Script", cursive;
            font-size: {{ mb_strlen($participantName) > 34 ? 44 : (mb_strlen($participantName) > 21 ? 52 : 64) }}px;
            font-weight: 400;
            line-height: 1.2;
            white-space: nowrap;
        }

        .name-line {
            width: 300px;
            height: 2px;
            margin: 8px auto 0;
            background: #b99645;
        }

        .training-block {
            position: absolute;
            z-index: 5;
            top: 370px;
            left: 175px;
            width: 491px;
            text-align: center;
        }

        .training-label {
            margin: 0;
            font-size: 15px;
            font-weight: 400;
            line-height: 1.5;
        }

        .training-title {
            max-height: 50px;
            margin: 6px auto 0;
            overflow: hidden;
            color: #000000;
            font-size: 18px;
            font-weight: 700;
            line-height: 1.35;
        }

        .signature {
            position: absolute;
            z-index: 6;
            top: 438px;
            left: 290px;
            width: 260px;
            text-align: center;
        }

        .signature-space {
            text-align: center;
            height: 56px;
        }

        .signature-image {
            max-width: 150px;
            max-height: 54px;
            object-fit: contain;
        }

        .signature-line {
            width: 122px;
            height: 0;
            margin: 0 auto 7px;
            border-top: 2px solid #000000;
        }

        .director-name {
            margin: 0;
            font-size: 12px;
            font-weight: 400;
            line-height: 1.35;
        }

        .director-title {
            margin: 2px 0 0;
            font-size: 15px;
            font-weight: 700;
            line-height: 1.25;
        }
    </style>
</head>
<body>
    <main class="certificate">
        @if ($assets['bgDaun'])
            <img src="{{ $assets['bgDaun'] }}" class="asset bg-daun" alt="">
        @endif
        @if ($assets['frameGold'])
            <img src="{{ $assets['frameGold'] }}" class="asset frame-gold" alt="">
        @endif
        @if ($assets['sudutAtas'])
            <img src="{{ $assets['sudutAtas'] }}" class="asset sudut-atas" alt="">
        @endif
        @if ($assets['sudutBawah'])
            <img src="{{ $assets['sudutBawah'] }}" class="asset sudut-bawah" alt="">
        @endif
        @if ($assets['daunKananAtas'])
            <img src="{{ $assets['daunKananAtas'] }}" class="asset daun-kanan-atas" alt="">
        @endif
        @if ($assets['piagam'])
            <img src="{{ $assets['piagam'] }}" class="asset piagam" alt="">
        @endif

        <section class="content">
            <header class="title-block">
                <h1 class="title">SERTIFIKAT</h1>
                <p class="subtitle">PENGHARGAAN</p>
                @if ($assets['garisGold'])
                    <img src="{{ $assets['garisGold'] }}" class="garis-gold" alt="">
                @endif
            </header>

            <section class="recipient">
                <p class="given-text">Sertifikat penghargaan ini diberikan kepada:</p>
                <div class="participant">{{ $participantName }}</div>
                <div class="name-line"></div>
            </section>

            <section class="training-block">
                <p class="training-label">telah berhasil mengikuti dan menyelesaikan</p>
                <p class="training-title">{{ $trainingTitle }}</p>
            </section>

            <section class="signature">
                <div class="signature-space">
                    @if ($assets['ttdDirektur'])
                        <img src="{{ $assets['ttdDirektur'] }}" class="signature-image" alt="">
                    @endif
                </div>
                <div class="signature-line"></div>
                <p class="director-name">Dr. Charles Z. Suoth, MARS</p>
                <p class="director-title">Direktur RSABL</p>
            </section>
        </section>
    </main>
</body>
</html>
