import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { UsageSpecMetricsComponent } from './usage-spec-metrics.component';

describe('UsageSpecMetricsComponent', () => {
  let component: UsageSpecMetricsComponent;
  let fixture: ComponentFixture<UsageSpecMetricsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [UsageSpecMetricsComponent, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UsageSpecMetricsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not accept a metric whose name already exists, ignoring case', () => {
    component.writeValue([{ id: 'm1', name: 'CPU', description: '', valueType: 'number' }]);
    component.metricsForm.setValue({ name: ' cpu ', description: '' });
    expect(component.metricsForm.controls.name.hasError('nonUniqueName')).toBeTrue();
    component.saveMetric();
    expect(component.metrics.length).toBe(1);
  });

  it('should save a trimmed, unique metric and report it as a metrics change', () => {
    const emitted: any[] = [];
    (component as any).eventMessage.emitSubformChange = (c: any) => emitted.push(c);
    component.metricsForm.setValue({ name: ' ram ', description: 'd' });
    component.saveMetric();
    expect(component.metrics.map(m => m.name)).toEqual(['ram']);
    expect(emitted[0].subformType).toBe('metrics');
    component.deleteMetric(component.metrics[0]);
    expect(component.metrics).toEqual([]);
    expect(emitted[1].subformType).toBe('metrics');
  });
});
