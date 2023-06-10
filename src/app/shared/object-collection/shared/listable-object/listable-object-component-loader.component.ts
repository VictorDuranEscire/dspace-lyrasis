import { ChangeDetectorRef, Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { combineLatest, Observable, of as observableOf } from 'rxjs';
import { take } from 'rxjs/operators';
import { ListableObject } from '../listable-object.model';
import { ViewMode } from '../../../../core/shared/view-mode.model';
import { Context } from 'src/app/core/shared/context.model';
import { getListableObjectComponent } from './listable-object.decorator';
import { GenericConstructor } from '../../../../core/shared/generic-constructor';
import { CollectionElementLinkType } from '../../collection-element-link.type';
import { DSpaceObject } from '../../../../core/shared/dspace-object.model';
import { AbstractComponentLoaderComponent } from '../../../abstract-component-loader/abstract-component-loader.component';
import { ThemeService } from 'src/app/shared/theme-support/theme.service';

@Component({
  selector: 'ds-listable-object-component-loader',
  styleUrls: ['./listable-object-component-loader.component.scss'],
  templateUrl: '../../../abstract-component-loader/abstract-component-loader.component.html',
})
/**
 * Component for determining what component to use depending on the item's entity type (dspace.entity.type)
 */
export class ListableObjectComponentLoaderComponent extends AbstractComponentLoaderComponent<Component> {

  /**
   * The item or metadata to determine the component for
   */
  @Input() object: ListableObject;

  /**
   * The index of the object in the list
   */
  @Input() index: number;

  /**
   * The preferred view-mode to display
   */
  @Input() viewMode: ViewMode;

  /**
   * The context of listable object
   */
  @Input() context: Context;

  /**
   * The type of link used to render the links inside the listable object
   */
  @Input() linkType: CollectionElementLinkType;

  /**
   * The identifier of the list this element resides in
   */
  @Input() listID: string;

  /**
   * Whether to show the badge label or not
   */
  @Input() showLabel = true;

  /**
   * Whether to show the thumbnail preview
   */
  @Input() showThumbnails;

  /**
   * The value to display for this element
   */
  @Input() value: string;

  /**
   * Emit when the listable object has been reloaded.
   */
  @Output() contentChange = new EventEmitter<ListableObject>();

  /**
   * The list of input and output names for the dynamic component
   */
  protected inAndOutputNames: (keyof this)[] = [
    ...this.inAndOutputNames,
    'object',
    'index',
    'linkType',
    'listID',
    'showLabel',
    'showThumbnails',
    'viewMode',
    'value',
    'contentChange',
  ];

  constructor(
    protected themeService: ThemeService,
    protected cdr: ChangeDetectorRef,
  ) {
    super(themeService);
  }

  public instantiateComponent(changes?: SimpleChanges): void {
    super.instantiateComponent(changes);
    if ((this.compRef.instance as any).reloadedObject) {
      combineLatest([
        observableOf(changes),
        (this.compRef.instance as any).reloadedObject.pipe(take(1)) as Observable<DSpaceObject>,
      ]).subscribe(([simpleChanges, reloadedObject]: [SimpleChanges, DSpaceObject]) => {
        if (reloadedObject) {
          this.compRef.destroy();
          this.object = reloadedObject;
          this.instantiateComponent(simpleChanges);
          this.cdr.detectChanges();
          this.contentChange.emit(reloadedObject);
        }
      });
    }
  }

  public getComponent(): GenericConstructor<Component> {
    return getListableObjectComponent(this.object.getRenderTypes(), this.viewMode, this.context, this.themeService.getThemeName());
  }

}
