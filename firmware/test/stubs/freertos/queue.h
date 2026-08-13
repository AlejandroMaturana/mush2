#ifndef NATIVE_FREERTOS_QUEUE_STUB_H
#define NATIVE_FREERTOS_QUEUE_STUB_H
#pragma once

// Stub host-only de freertos/queue.h: cola funcional en memoria para la suite
// nativa (event_bus.cpp la usa con xQueueCreate/xQueueSend/xQueueReceive).

#include "FreeRTOS.h"
#include <string.h>
#include <vector>
#include <stdint.h>

typedef void* QueueHandle_t;

struct NativeQueue {
  size_t itemSize;
  int max;
  int count;
  int head;
  int tail;
  std::vector<std::vector<uint8_t> > items;
};

inline QueueHandle_t xQueueCreate(int uxQueueLength, size_t uxItemSize) {
  NativeQueue* q = new NativeQueue();
  q->itemSize = uxItemSize;
  q->max = uxQueueLength;
  q->count = 0;
  q->head = 0;
  q->tail = 0;
  q->items.resize(uxQueueLength);
  return static_cast<void*>(q);
}

inline BaseType_t xQueueSend(QueueHandle_t xQueue, const void* pvItemToQueue, TickType_t xTicksToWait) {
  (void)xTicksToWait;
  NativeQueue* q = static_cast<NativeQueue*>(xQueue);
  if (!q || q->count == q->max) return pdFALSE;
  const uint8_t* src = static_cast<const uint8_t*>(pvItemToQueue);
  q->items[q->tail].assign(src, src + q->itemSize);
  q->tail = (q->tail + 1) % q->max;
  q->count++;
  return pdTRUE;
}

inline BaseType_t xQueueSendFromISR(QueueHandle_t xQueue, const void* pvItemToQueue, BaseType_t* pxHigherPriorityTaskWoken) {
  if (pxHigherPriorityTaskWoken) *pxHigherPriorityTaskWoken = pdFALSE;
  return xQueueSend(xQueue, pvItemToQueue, 0);
}

inline BaseType_t xQueueReceive(QueueHandle_t xQueue, void* pvBuffer, TickType_t xTicksToWait) {
  (void)xTicksToWait;
  NativeQueue* q = static_cast<NativeQueue*>(xQueue);
  if (!q || q->count == 0) return pdFALSE;
  memcpy(pvBuffer, q->items[q->head].data(), q->itemSize);
  q->head = (q->head + 1) % q->max;
  q->count--;
  return pdTRUE;
}

#endif
