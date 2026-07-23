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
            color: #2c313c;
            font-family: DejaVu Sans, Arial, sans-serif;
        }

        .certificate {
            position: relative;
            width: 297mm;
            height: 210mm;
            overflow: hidden;
            background: #fff;
        }

        .outer-border {
            position: absolute;
            inset: 9mm;
            border: 1.8mm solid #c69b36;
        }

        .inner-border {
            position: absolute;
            inset: 13mm 16mm 13mm 16mm;
            border: .45mm solid #ead477;
        }

        .top-rule {
            position: absolute;
            top: 18mm;
            left: 62mm;
            width: 169mm;
            height: 1.8mm;
            background: linear-gradient(90deg, #a97916, #faef9a, #a97916);
        }

        .corner-left-green {
            position: absolute;
            top: -30mm;
            left: -26mm;
            width: 108mm;
            height: 108mm;
            background: linear-gradient(135deg, #00843f, #004b25);
            transform: rotate(45deg);
        }

        .corner-left-gold {
            position: absolute;
            top: 32mm;
            left: -14mm;
            width: 82mm;
            height: 82mm;
            border: 8mm solid #d0a13b;
            transform: rotate(45deg);
        }

        .corner-right-green {
            position: absolute;
            right: -34mm;
            bottom: -35mm;
            width: 112mm;
            height: 112mm;
            background: linear-gradient(135deg, #004a25, #008847);
            transform: rotate(45deg);
        }

        .corner-right-gold {
            position: absolute;
            right: -12mm;
            bottom: 18mm;
            width: 77mm;
            height: 77mm;
            border: 8mm solid #d3a23b;
            transform: rotate(45deg);
        }

        .laurel {
            position: absolute;
            top: 28mm;
            left: 63mm;
            width: 171mm;
            height: 132mm;
            opacity: .105;
        }

        .gold-flourish {
            position: absolute;
            top: -5mm;
            right: 8mm;
            width: 72mm;
            height: 63mm;
        }

        .seal {
            position: absolute;
            left: 34mm;
            bottom: 27mm;
            width: 44mm;
            height: 44mm;
            border-radius: 50%;
            background: radial-gradient(circle, #fff3a7 0 8%, #c28b2e 9% 12%, #f6d56d 13% 28%, #b97824 29% 31%, #f7dd78 32% 48%, #b16b22 49% 53%, #f2cc61 54% 100%);
            box-shadow: 0 2mm 3mm rgba(104, 72, 18, .25);
        }

        .seal:before,
        .seal:after {
            content: "";
            position: absolute;
            bottom: -31mm;
            width: 13mm;
            height: 37mm;
            background: #f0cf6a;
            z-index: -1;
        }

        .seal:before {
            left: 9mm;
            transform: skew(-14deg);
        }

        .seal:after {
            right: 9mm;
            transform: skew(14deg);
        }

        .content {
            position: absolute;
            top: 28mm;
            left: 56mm;
            width: 185mm;
            text-align: center;
        }

        .title {
            margin: 0;
            font-family: Georgia, "Times New Roman", serif;
            font-size: 30mm;
            font-weight: 700;
            line-height: .9;
            letter-spacing: .9mm;
        }

        .subtitle {
            margin: 8mm 0 10mm;
            font-family: Georgia, "Times New Roman", serif;
            font-size: 13mm;
            font-weight: 700;
            letter-spacing: 3.4mm;
        }

        .ornament {
            position: relative;
            width: 127mm;
            height: 8mm;
            margin: 0 auto 11mm;
            border-top: .7mm solid #dfa53a;
            border-bottom: .7mm solid #dfa53a;
        }

        .ornament:before {
            content: "✶";
            position: absolute;
            top: -5.6mm;
            left: 50%;
            width: 12mm;
            height: 12mm;
            margin-left: -6mm;
            border: .6mm solid #e0a33b;
            border-radius: 50%;
            background: #fff;
            color: #e0a33b;
            font-size: 7mm;
            line-height: 11mm;
        }

        .label {
            margin: 0 0 16mm;
            font-size: 5.2mm;
            font-weight: 700;
        }

        .participant {
            min-height: 19mm;
            margin: 0 auto 12mm;
            font-family: Georgia, "Times New Roman", serif;
            font-size: 12mm;
            font-weight: 700;
            line-height: 1.1;
            color: #202733;
        }

        .divider {
            width: 180mm;
            height: .6mm;
            margin: 0 auto 12mm;
            background: #e0b64f;
        }

        .description {
            margin: 0;
            font-family: Georgia, "Times New Roman", serif;
            font-size: 5.3mm;
            line-height: 1.35;
        }

        .training {
            display: block;
            font-weight: 700;
        }

        .signature {
            position: absolute;
            left: 0;
            right: 0;
            bottom: -69mm;
            text-align: center;
            font-family: DejaVu Sans, Arial, sans-serif;
        }

        .signature-line {
            width: 47mm;
            height: .7mm;
            margin: 0 auto 5mm;
            background: #2c313c;
        }

        .signature-name {
            margin: 0 0 2mm;
            font-size: 4.6mm;
            font-weight: 700;
        }

        .signature-role {
            margin: 0;
            font-size: 6.2mm;
            font-weight: 800;
        }
    </style>
</head>
<body>
    <main class="certificate">
        <div class="outer-border"></div>
        <div class="inner-border"></div>
        <div class="top-rule"></div>
        <div class="corner-left-green"></div>
        <div class="corner-left-gold"></div>
        <div class="corner-right-green"></div>
        <div class="corner-right-gold"></div>

        <svg class="laurel" viewBox="0 0 640 500" aria-hidden="true">
            <g fill="none" stroke="#c9b17b" stroke-width="10">
                <path d="M217 425 C78 330 85 135 270 46" />
                <path d="M423 425 C562 330 555 135 370 46" />
            </g>
            <g fill="#c9b17b">
                @for ($i = 0; $i < 13; $i++)
                    <ellipse cx="{{ 172 - ($i * 8) }}" cy="{{ 382 - ($i * 25) }}" rx="18" ry="42" transform="rotate({{ -45 + ($i * 7) }} {{ 172 - ($i * 8) }} {{ 382 - ($i * 25) }})" />
                    <ellipse cx="{{ 468 + ($i * 8) }}" cy="{{ 382 - ($i * 25) }}" rx="18" ry="42" transform="rotate({{ 45 - ($i * 7) }} {{ 468 + ($i * 8) }} {{ 382 - ($i * 25) }})" />
                @endfor
            </g>
        </svg>

        <svg class="gold-flourish" viewBox="0 0 300 260" aria-hidden="true">
            <g fill="none" stroke="#d4a43b" stroke-width="8" stroke-linecap="round">
                <path d="M285 6 C215 14 230 95 154 88 C104 84 91 44 125 22" />
                <path d="M285 26 C245 55 251 111 190 125 C142 136 120 112 118 90" />
                <path d="M283 55 C251 95 260 164 196 190" />
                <path d="M232 2 C221 58 178 74 162 120" />
            </g>
            <g fill="#f4d56f" stroke="#b7862b" stroke-width="2">
                <path d="M190 90 C160 56 162 22 205 1 C215 43 217 68 190 90Z" />
                <path d="M168 129 C124 120 104 89 123 53 C151 82 173 101 168 129Z" />
                <path d="M214 174 C185 149 188 112 228 96 C236 132 238 157 214 174Z" />
                <circle cx="164" cy="158" r="8" />
                <circle cx="183" cy="181" r="6" />
                <circle cx="205" cy="199" r="5" />
            </g>
        </svg>

        <div class="seal"></div>

        <section class="content">
            <h1 class="title">SERTIFIKAT</h1>
            <p class="subtitle">PENGHARGAAN</p>
            <div class="ornament"></div>
            <p class="label">Sertifikat penghargaan ini diberikan kepada:</p>
            <p class="participant">{{ $participantName }}</p>
            <div class="divider"></div>
            <p class="description">
                telah mengikuti dan menyelesaikan
                <span class="training">{{ $trainingTitle }}</span>
                yang diselenggarakan pada {{ $trainingPeriod }}
            </p>

            <div class="signature">
                <div class="signature-line"></div>
                <p class="signature-name">Dr. Charles Z. Suoth, MARS</p>
                <p class="signature-role">Direktur RSABL</p>
            </div>
        </section>
    </main>
</body>
</html>
