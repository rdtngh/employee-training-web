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
            right: 0;
            width: 198px;
            height: 196px;
            opacity: .38;
        }

        .piagam {
            z-index: 3;
            left: 90px;
            bottom: 120px;
            width: 130px;
            height: 150px;
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
            font-size: 58px;
            font-weight: 700;
            line-height: 1;
            letter-spacing: 0;
        }

        .subtitle {
            margin: 4px 0 0;
            font-family: Georgia, "Times New Roman", serif;
            font-size: 26px;
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

        .brand {
            position: absolute;
            z-index: 6;
            top: 50px;
            right: 35px;
            width: 175px;
            text-align: center;
        }

        .brand img {
            width: 60px;
            height: 60px;
            margin: 0 auto;
        }

        .brand p {
            margin: 5px 0 0;
            color: #327537;
            font-size: 15px;
            font-weight: 700;
            line-height: 1.18;
        }

        .brand span {
            display: block;
        }

        .certificate-number {
            position: absolute;
            z-index: 5;
            top: 164px;
            left: 140px;
            width: 561px;
            margin: 0;
            font-size: 11px;
            font-weight: 400;
            line-height: 1.4;
            text-align: center;
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
            font-size: 14px;
            font-weight: 400;
            line-height: 1.4;
        }

        .participant {
            max-width: 620px;
            margin: -10px auto -8px;
            padding: 10px 18px 8px;
            color: #b99645;
            font-family: "Brush Script MT", "Segoe Script", cursive;
            font-size: {{ mb_strlen($participantName) > 34 ? 40 : (mb_strlen($participantName) > 21 ? 48 : 60) }}px;
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
            top: 345px;
            left: 175px;
            width: 491px;
            text-align: center;
        }

        .training-label {
            margin: 0;
            font-size: 14px;
            font-weight: 400;
            line-height: 1.35;
        }

        .training-title {
            max-height: 43px;
            margin: 4px auto 0;
            overflow: hidden;
            color: #000000;
            font-size: 15px;
            font-weight: 700;
            line-height: 1.32;
        }

        .training-date {
            margin: 3px 0 0;
            font-size: 14px;
            font-weight: 400;
            line-height: 1.35;
        }

        .training-location {
            margin: 1px 0 0;
            font-size: 12px;
            font-weight: 600;
            line-height: 1.15;
        }

        .signature {
            position: absolute;
            z-index: 6;
            top: 456px;
            left: 290px;
            width: 260px;
            text-align: center;
        }

        .signature-space {
            text-align: center;
            height: 45px;
        }

        .signature-image {
            max-width: 180px;
            max-height: 70px;
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
            font-size: 13px;
            font-weight: 400;
            line-height: 1.35;
        }

        .director-title {
            margin: 2px 0 0;
            font-size: 15px;
            font-weight: 400;
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

            <section class="brand">
                @if ($assets['logoRsabl'])
                    <img src="{{ $assets['logoRsabl'] }}" alt="">
                @endif
                <p>
                    <span>Rumah Sakit Advent</span>
                    <span>Bandar Lampung</span>
                </p>
            </section>

            @if ($certificateNumber)
                <p class="certificate-number">{{ $certificateNumber }}</p>
            @endif

            <section class="recipient">
                <p class="given-text">Sertifikat ini diberikan kepada:</p>
                <div class="participant">{{ $participantName }}</div>
                <div class="name-line"></div>
            </section>

            <section class="training-block">
                <p class="training-label">Telah mengikuti dan dinyatakan lulus pada</p>
                <p class="training-title">{{ $trainingTitle }}</p>
                @if ($completionDate)
                    <p class="training-date">pada tanggal {{ $completionDate }}.</p>
                    <p class="training-location">BANDAR LAMPUNG</p>
                @endif
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
