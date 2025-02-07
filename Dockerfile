FROM python:3.13-slim AS base

FROM base AS builder

RUN apt update && apt install gcc g++ -y

WORKDIR /usr/app

# Need poetry to install deps
RUN python3 -m pip install poetry==1.8.2

COPY pyproject.toml poetry.lock ./

# Tell poetry to install deps in current dir, will be more slim for the copy
RUN poetry config virtualenvs.in-project true

# Don't need dev deps for prod code
RUN poetry install --without dev

FROM base AS main

RUN apt update && apt install wget ffmpeg -y && wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -P /usr/bin && chmod +x /usr/bin/yt-dlp

WORKDIR /usr/app

COPY --from=builder /usr/app/.venv /venv

# Tell python where to take deps
ENV PATH="/venv/bin:$PATH"

COPY half_past_five/ ./half_past_five
COPY static/ ./static
COPY templates/ ./templates

ENTRYPOINT ["python", "-m", "half_past_five.half_past_five"]
