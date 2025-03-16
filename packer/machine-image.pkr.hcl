packer {
  required_plugins {
    amazon = {
      version = ">= 1.0.0, < 2.0.0"
      source  = "github.com/hashicorp/amazon"
    }

    googlecompute = {
      version = ">= 1.0.0, < 2.0.0"
      source  = "github.com/hashicorp/googlecompute"
    }
  }
}

variable "aws_region" {
  description = "AWS region to deploy the instance"
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "AWS CLI profile to use for authentication"
  default     = "dev"
}

variable "instance_type" {
  description = "AWS EC2 instance type"
  default     = "t3.micro"
}

# GCP Variables
variable "gcp_project_id" {
  description = "GCP Project ID"
  default     = "gcp-dev-452120"
}

variable "gcp_region" {
  description = "GCP Region"
  default     = "us-east1"
}

variable "gcp_zone" {
  description = "GCP Zone"
  default     = "us-central1-a"
}

source "amazon-ebs" "custom_ami" {
  region        = var.aws_region
  profile       = var.aws_profile
  instance_type = var.instance_type
  ami_name      = "custom-ami-{{timestamp}}"
  source_ami_filter {
    filters = {
      name                = "ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"
      root-device-type    = "ebs"
      virtualization-type = "hvm"
    }
    owners      = ["099720109477"] # Canonical
    most_recent = true
  }
  ssh_username = "ubuntu"
}

# GCP Image Source
source "googlecompute" "custom_gce_image" {
  project_id          = var.gcp_project_id
  region              = var.gcp_region
  zone                = var.gcp_zone
  machine_type        = "e2-medium"
  source_image_family = "ubuntu-2204-lts"
  image_name          = "custom-gce-image-{{timestamp}}"
  image_family        = "custom-webapp-family"
  image_description   = "Custom GCE image with PostgreSQL and WebApp"
  ssh_username        = "ubuntu"
}

build {
  sources = [
    "source.amazon-ebs.custom_ami",
    "source.googlecompute.custom_gce_image"
  ]

  provisioner "file" {
    source      = "../webapp.zip"
    destination = "/tmp/webapp.zip" # Target path in the VM
  }

  provisioner "shell" {
    inline = [
       # Ensure package lists are updated
      "sudo apt update -y",
      "sudo apt upgrade -y",
      "sudo apt clean",

      # Ensure 'universe' repository is enabled
      "sudo apt-get install -y software-properties-common",
      "sudo add-apt-repository universe",
      "sudo apt-get update -y",

      # Install required packages, including zip
      "sudo apt install -y curl gnupg lsb-release unzip zip",

      # Add PostgreSQL repository and install PostgreSQL
      "curl https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo tee /etc/apt/trusted.gpg.d/pgdg.asc",
      "echo \"deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -c | awk '{print $2}')-pgdg main\" | sudo tee /etc/apt/sources.list.d/pgdg.list",
      "sudo apt update -y",
      "sudo apt install -y postgresql postgresql-contrib",

      # Install Node.js and npm
      "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -",
      "sudo apt install -y nodejs",

      # Ensure PostgreSQL service is running and enabled
      "sudo systemctl enable postgresql",
      "sudo systemctl start postgresql",

      # Ensure PostgreSQL configuration allows password authentication
      "PG_CONF=$(ls /etc/postgresql/*/main/pg_hba.conf) && sudo sed -i 's/local   all             all                                     peer/local   all             all                                     md5/' $PG_CONF",
      "sudo systemctl restart postgresql",

      # Set PostgreSQL password and create database
      "sudo -u postgres psql -c \"ALTER USER postgres WITH PASSWORD 'password123';\"",
      "sudo -u postgres psql -c \"CREATE DATABASE csye6225;\"",

      # Ensure group and user exist
      "sudo groupadd -f csye6225",
      "sudo useradd -m -g csye6225 -s /bin/bash csye6225 || echo 'User csye6225 already exists'",

      # Ensure /opt/webapp exists and zip the contents of the directory
      "sudo mkdir -p /opt/webapp",
      "if [ -d /opt/webapp ]; then sudo zip -r /tmp/webapp.zip /opt/webapp; else echo 'WARNING: /opt/webapp directory does not exist, skipping zip.'; fi",

      # Ensure webapp.zip exists and extract it
      "if [ -f /tmp/webapp.zip ]; then sudo unzip /tmp/webapp.zip -d /opt/webapp; else echo 'WARNING: /tmp/webapp.zip does not exist, skipping unzip.'; fi",
      "sudo chown -R csye6225:csye6225 /opt/webapp",

      # Create systemd service for the webapp
      "echo '[Unit]\nDescription=CSYE 6225 App\nConditionPathExists=/opt/webapp/webapp/.env\nAfter=network.target\n\n[Service]\nType=simple\nUser=csye6225\nGroup=csye6225\nWorkingDirectory=/opt/webapp/webapp\nExecStart=/usr/bin/node /opt/webapp/webapp/app.js\nRestart=always\nRestartSec=3\nStandardOutput=syslog\nStandardError=syslog\nSyslogIdentifier=csye6225\n\n[Install]\nWantedBy=multi-user.target' | sudo tee /etc/systemd/system/webapp.service",
      "sudo systemctl daemon-reload",
      "sudo systemctl enable webapp.service"
    ]
  }
}