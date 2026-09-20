FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Backend.slnx ./
COPY src/Backend.Api/Backend.Api.csproj src/Backend.Api/
COPY src/Backend.Application/Backend.Application.csproj src/Backend.Application/
COPY src/Backend.Domain/Backend.Domain.csproj src/Backend.Domain/
COPY src/Backend.Infrastructure/Backend.Infrastructure.csproj src/Backend.Infrastructure/
COPY tests/Backend.Api.Tests/Backend.Api.Tests.csproj tests/Backend.Api.Tests/
RUN dotnet restore src/Backend.Api/Backend.Api.csproj

COPY . .
RUN dotnet publish src/Backend.Api/Backend.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runner
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends libgssapi-krb5-2 curl \
  && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 dotnetgroup \
  && useradd --system --uid 1001 --gid dotnetgroup dotnetuser

COPY --from=build /app/publish .

RUN chown -R dotnetuser:dotnetgroup /app
USER dotnetuser

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Backend.Api.dll"]
