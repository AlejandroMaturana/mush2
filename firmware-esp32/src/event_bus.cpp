#include "event_bus.h"

EventBus eventBus;

EventBus::EventBus()
  : _eventQueue(nullptr), _subscriberMutex(nullptr), _pendingCount(0), _initialized(false) {
  memset(_typeSubscribers, 0, sizeof(_typeSubscribers));
}

bool EventBus::init() {
  if (_initialized) return true;

  _eventQueue = xQueueCreate(EVENT_QUEUE_SIZE, sizeof(Event));
  if (!_eventQueue) {
    Serial.println("[EVENTBUS] Error creando cola de eventos");
    return false;
  }

  _subscriberMutex = xSemaphoreCreateMutex();
  if (!_subscriberMutex) {
    Serial.println("[EVENTBUS] Error creando mutex");
    return false;
  }

  _initialized = true;
  Serial.printf("[EVENTBUS] Inicializado (queue=%d, max_subscribers/type=%d)\n",
    EVENT_QUEUE_SIZE, MAX_SUBSCRIBERS_PER_TYPE);
  return true;
}

bool EventBus::subscribe(EventType type, EventCallback callback, void* context) {
  if (!_initialized || type >= EVT_COUNT || !callback) return false;

  xSemaphoreTake(_subscriberMutex, portMAX_DELAY);

  TypeSubscribers& ts = _typeSubscribers[type];
  for (int i = 0; i < MAX_SUBSCRIBERS_PER_TYPE; i++) {
    if (!ts.subscribers[i].active) {
      ts.subscribers[i].callback = callback;
      ts.subscribers[i].context = context;
      ts.subscribers[i].active = true;
      xSemaphoreGive(_subscriberMutex);
      return true;
    }
  }

  xSemaphoreGive(_subscriberMutex);
  Serial.printf("[EVENTBUS] subscribers llenos para tipo %d\n", type);
  return false;
}

bool EventBus::unsubscribe(EventType type, EventCallback callback) {
  if (!_initialized || type >= EVT_COUNT || !callback) return false;

  xSemaphoreTake(_subscriberMutex, portMAX_DELAY);

  TypeSubscribers& ts = _typeSubscribers[type];
  for (int i = 0; i < MAX_SUBSCRIBERS_PER_TYPE; i++) {
    if (ts.subscribers[i].active && ts.subscribers[i].callback == callback) {
      ts.subscribers[i].active = false;
      ts.subscribers[i].callback = nullptr;
      ts.subscribers[i].context = nullptr;
      xSemaphoreGive(_subscriberMutex);
      return true;
    }
  }

  xSemaphoreGive(_subscriberMutex);
  return false;
}

void EventBus::publish(const Event& event) {
  if (!_initialized) return;

  if (xQueueSend(_eventQueue, &event, 0) != pdTRUE) {
    Serial.printf("[EVENTBUS] Cola llena, evento %d descartado\n", event.type);
    return;
  }
  portENTER_CRITICAL(&_spinlock);
  _pendingCount++;
  portEXIT_CRITICAL(&_spinlock);
}

void EventBus::publishFromISR(const Event& event) {
  if (!_initialized) return;

  BaseType_t xHigherPriorityTaskWoken = pdFALSE;
  xQueueSendFromISR(_eventQueue, &event, &xHigherPriorityTaskWoken);
  portENTER_CRITICAL(&_spinlock);
  _pendingCount++;
  portEXIT_CRITICAL(&_spinlock);

  if (xHigherPriorityTaskWoken) {
    portYIELD_FROM_ISR();
  }
}

void EventBus::loop() {
  if (!_initialized) return;

  Event event;
  while (xQueueReceive(_eventQueue, &event, 0) == pdTRUE) {
    portENTER_CRITICAL(&_spinlock);
    _pendingCount--;
    portEXIT_CRITICAL(&_spinlock);

    xSemaphoreTake(_subscriberMutex, portMAX_DELAY);

    TypeSubscribers& ts = _typeSubscribers[event.type];
    for (int i = 0; i < MAX_SUBSCRIBERS_PER_TYPE; i++) {
      if (ts.subscribers[i].active && ts.subscribers[i].callback) {
        xSemaphoreGive(_subscriberMutex);
        ts.subscribers[i].callback(event, ts.subscribers[i].context);
        xSemaphoreTake(_subscriberMutex, portMAX_DELAY);
      }
    }

    xSemaphoreGive(_subscriberMutex);
  }
}

uint32_t EventBus::getPendingCount() {
  portENTER_CRITICAL(&_spinlock);
  uint32_t count = _pendingCount;
  portEXIT_CRITICAL(&_spinlock);
  return count;
}
