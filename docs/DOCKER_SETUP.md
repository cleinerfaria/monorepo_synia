# 🐳 Docker Desktop Setup

## Por que Docker?

Supabase local precisa rodar em containers Docker:
- PostgreSQL (banco de dados)
- Redis (cache)
- Supabase API
- Studio (interface web)

Sem Docker, não é possível rodar ambiente local.

---

## 📥 Instalação - Windows

### Passo 1: Baixar e Instalar

1. Acesse: https://www.docker.com/products/docker-desktop
2. Clique em "Download for Windows"
3. Escolha a versão correta:
   - **Intel/AMD** (maioria dos PCs)
   - **ARM** (M1/M2 Mac - não aplicável aqui)
4. Execute o instalador (`Docker Desktop Installer.exe`)
5. Siga as instruções (vai pedir permissão de admin)

### Passo 2: Configurar WSL2 (Recomendado)

Durante a instalação, selecione:
- ✅ "Install required Windows components for WSL 2"
- ✅ "Use WSL 2 instead of Hyper-V"

### Passo 3: Reiniciar

```bash
# Reinicie sua máquina
shutdown /r /t 0
```

Ou simplesmente **reinicie manualmente**.

### Passo 4: Verificar Instalação

```bash
# Abra PowerShell ou CMD e teste
docker --version
docker run hello-world
```

Se ver a mensagem "Hello from Docker!", está instalado corretamente.

---

## ✅ Verificar se Docker está Rodando

### Windows

1. Procure pelo ícone do Docker na **system tray** (canto inferior direito)
2. Se não estiver lá, abra Docker Desktop manualmente:
   - Procure "Docker Desktop" no Menu Iniciar
   - Clique para abrir

3. Confirme que está rodando:
   ```bash
   docker ps
   ```
   (Se não der erro, está rodando)

---

## 🚀 Depois de Instalar

Agora execute:

```bash
npm run setup:dev:aurea
```

---

## 🐛 Troubleshooting

### Erro: "Docker daemon is not running"

```bash
# Windows: Abra Docker Desktop manualmente
# Procure o ícone na system tray (canto inferior direito)
# Se não estiver lá: Menu Iniciar > Docker Desktop

# Depois tente novamente
npm run setup:dev:aurea
```

### Erro: "Docker socket not found"

```bash
# Linux/WSL: O daemon do Docker não está rodando
sudo systemctl start docker

# Verificar
docker --version
```

### Erro: "Disk space insufficient"

```bash
# Docker precisa de espaço livre
# Libere ~10GB de espaço
# Ou limpe docker images antigos
docker system prune -a
```

### Erro: "Cannot connect to Docker daemon"

```bash
# 1. Verifique se Docker Desktop está aberto (Windows)
# 2. Verifique se Docker daemon está rodando (Linux/Mac)
# 3. Tente reiniciar Docker:
#    - Windows: Abra Docker Desktop novamente
#    - Linux: sudo systemctl restart docker

# 4. Tente novamente
npm run setup:dev:aurea
```

---

## 📋 Recursos Úteis

- [Docker Documentation](https://docs.docker.com/)
- [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
- [Supabase + Docker](https://supabase.com/docs/guides/local-development)

---

## ✨ Depois de Tudo Funcionando

```bash
# Verificar que está tudo OK
npx supabase status

# Acessar Studio (GUI)
open http://localhost:54323

# Acessar API
open http://localhost:54321
```

---

**Travou em algo?** Verifique a seção de Troubleshooting ou leia `docs/DEV_ENVIRONMENT.md`.
