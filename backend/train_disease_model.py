"""
Raitumitra Dedicated Crop Disease Model Training Pipeline
Uses MobileNetV3-Small transfer learning on the PlantVillage color dataset (38 classes).
Supports staged training (quick/smoke test and full dataset mode) with real progress reporting,
stratified train/validation splitting, checkpointing, and metrics tracking.
"""

import argparse
import io
import json
import os
import random
import sys
import time
from pathlib import Path

# Fix Windows cp1252 stdout encoding
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader, Subset
from torchvision import datasets, models, transforms
from torchvision.models import MobileNet_V3_Small_Weights

# Dataset and output paths
DATA_DIR = (
    Path.home()
    / "Downloads"
    / "PlantVillage-Dataset-master"
    / "PlantVillage-Dataset-master"
    / "raw"
    / "color"
)

MODEL_DIR = Path(__file__).resolve().parent / "models"
MODEL_PATH = MODEL_DIR / "plant_disease_mobilenet_v3.pth"
LABELS_PATH = MODEL_DIR / "plant_disease_classes.json"
METRICS_PATH = MODEL_DIR / "training_metrics.json"

def get_args():
    parser = argparse.ArgumentParser(description="Train RaituMitra MobileNetV3 Disease Classifier")
    parser.add_argument("--mode", choices=["quick", "full"], default="quick",
                        help="quick: balanced subset for CPU-safe training (~2 mins); full: complete 54k dataset")
    parser.add_argument("--samples-per-class", type=int, default=70,
                        help="Max training samples per class in quick mode (default 70)")
    parser.add_argument("--val-per-class", type=int, default=20,
                        help="Max validation samples per class in quick mode (default 20)")
    parser.add_argument("--batch-size", type=int, default=16, help="Batch size for DataLoader")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs")
    parser.add_argument("--image-size", type=int, default=160, help="Input image dimension (160 or 224)")
    parser.add_argument("--lr", type=float, default=1e-3, help="Learning rate")
    return parser.parse_args()

def main():
    args = get_args()
    seed = 42
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)

    device = torch.device("cpu")
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    if not DATA_DIR.exists():
        print(f"[ERROR] Dataset directory not found at {DATA_DIR}", file=sys.stderr)
        sys.exit(1)

    print("=" * 60)
    print("[INIT] RaituMitra Plant Disease Model Training Pipeline")
    print(f"[DATA] Directory: {DATA_DIR}")
    print(f"[CONFIG] Mode: {args.mode.upper()} | Epochs: {args.epochs} | Batch Size: {args.batch_size} | Image Size: {args.image_size}x{args.image_size}")
    print(f"[HARDWARE] Device: {device}")
    print("=" * 60)

    # Transforms: augment train data, keep eval clean
    train_transform = transforms.Compose([
        transforms.Resize((args.image_size, args.image_size)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(12),
        transforms.ColorJitter(brightness=0.12, contrast=0.12, saturation=0.10),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    eval_transform = transforms.Compose([
        transforms.Resize((args.image_size, args.image_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    print("[SCAN] Scanning dataset classes...")
    base_dataset = datasets.ImageFolder(DATA_DIR)
    classes = base_dataset.classes
    targets = np.array(base_dataset.targets)

    if len(classes) != 38:
        raise ValueError(f"Expected 38 classes, found {len(classes)}.")

    print(f"[OK] Found {len(classes)} classes across {len(base_dataset)} images.")

    # Stratified per-class split
    rng = np.random.default_rng(seed)
    train_indices = []
    val_indices = []

    for class_id in range(len(classes)):
        indices = np.where(targets == class_id)[0]
        rng.shuffle(indices)

        if args.mode == "quick":
            n_train = min(args.samples_per_class, len(indices) - 5)
            n_val = min(args.val_per_class, len(indices) - n_train)
            train_indices.extend(indices[:n_train].tolist())
            val_indices.extend(indices[n_train:n_train + n_val].tolist())
        else:
            val_count = max(1, round(len(indices) * 0.20))
            val_indices.extend(indices[:val_count].tolist())
            train_indices.extend(indices[val_count:].tolist())

    train_dataset_all = datasets.ImageFolder(DATA_DIR, transform=train_transform)
    val_dataset_all = datasets.ImageFolder(DATA_DIR, transform=eval_transform)

    train_dataset = Subset(train_dataset_all, train_indices)
    val_dataset = Subset(val_dataset_all, val_indices)

    print(f"[DATASET] Training samples: {len(train_dataset)} | Validation samples: {len(val_dataset)}")

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False, num_workers=0)

    print("[MODEL] Loading pretrained MobileNetV3-Small backbone...")
    weights = MobileNet_V3_Small_Weights.DEFAULT
    model = models.mobilenet_v3_small(weights=weights)

    # Replace classifier layer with 38 disease classes
    in_features = model.classifier[3].in_features
    model.classifier[3] = nn.Linear(in_features, len(classes))
    model = model.to(device)

    # Freeze feature backbone for transfer learning
    for param in model.features.parameters():
        param.requires_grad = False

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.classifier.parameters(), lr=args.lr)

    best_val_accuracy = 0.0
    metrics_history = []

    total_train_batches = len(train_loader)
    total_val_batches = len(val_loader)

    print(f"[TRAIN] Starting training ({args.epochs} epochs, {total_train_batches} batches/epoch)...")
    start_time = time.time()

    for epoch in range(args.epochs):
        epoch_start = time.time()
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        for b_idx, (images, labels) in enumerate(train_loader):
            images = images.to(device)
            labels = labels.to(device)

            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * images.size(0)
            correct += (outputs.argmax(1) == labels).sum().item()
            total += labels.size(0)

            # Visible progress every 20 batches
            if (b_idx + 1) % 20 == 0 or (b_idx + 1) == total_train_batches:
                elapsed = time.time() - epoch_start
                batches_left = total_train_batches - (b_idx + 1)
                eta = (elapsed / max(b_idx + 1, 1)) * batches_left
                curr_loss = running_loss / max(total, 1)
                curr_acc = correct / max(total, 1)
                print(f"  [Epoch {epoch+1}/{args.epochs}] Batch {b_idx+1}/{total_train_batches} | Loss: {curr_loss:.4f} | Acc: {curr_acc:.2%} | ETA: {eta:.0f}s", flush=True)

        train_loss = running_loss / max(total, 1)
        train_accuracy = correct / max(total, 1)

        # Validation phase
        model.eval()
        val_correct = 0
        val_total = 0
        val_loss = 0.0

        with torch.no_grad():
            for images, labels in val_loader:
                images = images.to(device)
                labels = labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                val_loss += loss.item() * images.size(0)
                predictions = outputs.argmax(1)
                val_correct += (predictions == labels).sum().item()
                val_total += labels.size(0)

        val_accuracy = val_correct / max(val_total, 1)
        val_loss_avg = val_loss / max(val_total, 1)
        epoch_time = time.time() - epoch_start

        epoch_stats = {
            "epoch": epoch + 1,
            "train_loss": round(train_loss, 4),
            "train_accuracy": round(train_accuracy, 4),
            "val_loss": round(val_loss_avg, 4),
            "val_accuracy": round(val_accuracy, 4),
            "duration_seconds": round(epoch_time, 1)
        }
        metrics_history.append(epoch_stats)

        print(
            f"[RESULT] Epoch {epoch + 1}/{args.epochs} Complete ({epoch_time:.1f}s) | "
            f"Train Loss: {train_loss:.4f} | Train Acc: {train_accuracy:.2%} | "
            f"Val Loss: {val_loss_avg:.4f} | Val Acc: {val_accuracy:.2%}",
            flush=True
        )

        if val_accuracy > best_val_accuracy:
            best_val_accuracy = val_accuracy
            torch.save(
                {
                    "model_state_dict": model.state_dict(),
                    "classes": classes,
                    "image_size": args.image_size,
                    "mean": [0.485, 0.456, 0.406],
                    "std": [0.229, 0.224, 0.225],
                    "best_val_accuracy": best_val_accuracy,
                    "architecture": "mobilenet_v3_small",
                },
                MODEL_PATH,
            )
            with open(LABELS_PATH, "w", encoding="utf-8") as file:
                json.dump(classes, file, indent=2)

            print(f"  [SAVED] New best model checkpoint to {MODEL_PATH} (Val Acc: {val_accuracy:.2%})", flush=True)

    # Save training metrics report
    total_time = time.time() - start_time
    summary_report = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "architecture": "mobilenet_v3_small",
        "dataset_classes": len(classes),
        "total_train_samples": len(train_dataset),
        "total_val_samples": len(val_dataset),
        "epochs": args.epochs,
        "batch_size": args.batch_size,
        "image_size": args.image_size,
        "best_val_accuracy": round(best_val_accuracy, 4),
        "total_training_seconds": round(total_time, 1),
        "history": metrics_history,
    }
    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(summary_report, f, indent=2)

    print("\n" + "=" * 60)
    print("[FINISHED] Training Successfully Finished!")
    print(f"[TIME] Total duration: {total_time:.1f}s")
    print(f"[ACCURACY] Best Validation Accuracy: {best_val_accuracy:.2%}")
    print(f"[MODEL] Checkpoint: {MODEL_PATH}")
    print(f"[LABELS] Class Labels: {LABELS_PATH}")
    print(f"[METRICS] Report: {METRICS_PATH}")
    print("=" * 60)

if __name__ == "__main__":
    main()
